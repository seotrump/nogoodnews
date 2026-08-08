/**
 * Layer 1 — 정체성 축 (Trait Axes) 유틸리티
 *
 * 판단축 4개(target, affection, mask, pace) 연속값을 양자화해
 * type_code를 생성한다. 표현축(tone_temp, vocab)은 type_code에
 * 반영하지 않고 프롬프트 조각으로 직접 삽입한다(Phase 4에서 처리).
 *
 * 양자화 규칙:
 *   0~3  → 1 (low)
 *   4~6  → 2 (mid)
 *   7~10 → 3 (high)
 *
 * type_code 형식: T{1-3}A{1-3}M{1-3}P{1-3}
 *   T = target    (공격 대상)
 *   A = affection (애정 여부)
 *   M = mask      (표정/태도)
 *   P = pace      (반응 속도감)
 *
 * 예: target=3, affection=7, mask=5, pace=9 → "T1A3M2P3"
 */

// AxisProfile — 6개 축 연속값
export interface AxisProfile {
  target:    number;  // 판단축: 공격 대상       (0~10)
  affection: number;  // 판단축: 애정 여부        (0~10)
  mask:      number;  // 판단축: 표정/태도        (0~10)
  pace:      number;  // 판단축: 반응 속도감      (0~10)
  tone_temp: number;  // 표현축: 말투 온도        (0~10)
  vocab:     number;  // 표현축: 어휘 스타일      (0~10)
}

// 기존 advanced_settings 키 매핑 (하위 호환)
export interface LegacyAxisSettings {
  axisTarget?:    number;
  axisAffection?: number;
  axisAttitude?:  number;  // 현재 코드의 mask 역할
  axisPace?:      number;  // 신규 (Phase 1에서 추가)
  axisTone?:      number;  // tone_temp
  axisVocab?:     number;  // vocab
}

/**
 * 단일 축 값(0~10)을 3구간으로 양자화한다.
 * @returns 1(low) | 2(mid) | 3(high)
 */
export function quantizeAxis(value: number): 1 | 2 | 3 {
  const clamped = Math.max(0, Math.min(10, Math.round(value)));
  if (clamped <= 3) return 1;
  if (clamped <= 6) return 2;
  return 3;
}

/**
 * 구간 코드(1~3)를 레이블로 변환한다.
 */
export function quantizeLabelKo(q: 1 | 2 | 3): string {
  if (q === 1) return '저(Low)';
  if (q === 2) return '중(Mid)';
  return '고(High)';
}

/**
 * AxisProfile → type_code 생성
 * 판단축 4개만 반영, 표현축 2개는 무시.
 */
export function generateTypeCode(profile: Pick<AxisProfile, 'target' | 'affection' | 'mask' | 'pace'>): string {
  const t = quantizeAxis(profile.target);
  const a = quantizeAxis(profile.affection);
  const m = quantizeAxis(profile.mask);
  const p = quantizeAxis(profile.pace);
  return `T${t}A${a}M${m}P${p}`;
}

/**
 * 기존 advanced_settings (axisXxx 형식) + axisPace(신규)를
 * 표준 AxisProfile로 변환한다.
 */
export function legacyToAxisProfile(legacy: LegacyAxisSettings): AxisProfile {
  return {
    target:    legacy.axisTarget    ?? 5,
    affection: legacy.axisAffection ?? 5,
    mask:      legacy.axisAttitude  ?? 5,  // axisAttitude → mask
    pace:      legacy.axisPace      ?? 5,  // 신규 축
    tone_temp: legacy.axisTone      ?? 5,
    vocab:     legacy.axisVocab     ?? 5,
  };
}

/**
 * type_code → 판단축 구간 객체로 파싱
 * 예: "T2A3M1P3" → { target: 2, affection: 3, mask: 1, pace: 3 }
 */
export function parseTypeCode(typeCode: string): { target: number; affection: number; mask: number; pace: number } | null {
  const match = typeCode.match(/^T([123])A([123])M([123])P([123])$/);
  if (!match) return null;
  return {
    target:    parseInt(match[1]),
    affection: parseInt(match[2]),
    mask:      parseInt(match[3]),
    pace:      parseInt(match[4]),
  };
}

/**
 * 두 type_code 간의 Manhattan 거리 계산 (유사봇 검색용)
 * 최솟값 0 (동일), 최댓값 8 (완전 반대)
 */
export function typeCodeDistance(a: string, b: string): number {
  const pa = parseTypeCode(a);
  const pb = parseTypeCode(b);
  if (!pa || !pb) return Infinity;
  return (
    Math.abs(pa.target    - pb.target)    +
    Math.abs(pa.affection - pb.affection) +
    Math.abs(pa.mask      - pb.mask)      +
    Math.abs(pa.pace      - pb.pace)
  );
}

// ──────────────────────────────────────────────
// Phase 1 (1-4, 1-5): 사고단계 매핑 & 주도축(Dominant Axis) 계산
// ──────────────────────────────────────────────
export const STAGE_ROLES: Record<string, { role: string; label: string; desc: string }> = {
  target:    { role: 'attention',      label: '주의 (Attention)',      desc: '뭐가 먼저 눈에 들어오는가' },
  affection: { role: 'interpretation', label: '해석 (Interpretation)', desc: '눈에 들어온 걸 뭘 기준으로 푸는가' },
  mask:      { role: 'attribution',    label: '귀결 (Attribution)',    desc: '그 해석을 어떤 태도로 정리하는가' },
  pace:      { role: 'expression',     label: '표현 (Expression)',     desc: '언제·어떤 세기로 꺼내는가' },
}

export type DecisionAxisKey = 'target' | 'affection' | 'mask' | 'pace';

/**
 * 주도축(Dominant Axis) 계산 함수
 * 주도축 = argmax(|axis_score - 5|)  (판단축 4개 중)
 * 5와의 거리 차가 가장 먼 축이 이 봇의 1순위 사고축이 됨.
 */
export function calculateDominantAxis(profile: Pick<AxisProfile, 'target' | 'affection' | 'mask' | 'pace'>): {
  axis_key: DecisionAxisKey;
  label: string;
  stage_role: string;
  distance: number;
} {
  const axes: DecisionAxisKey[] = ['target', 'affection', 'mask', 'pace'];
  let dominant: DecisionAxisKey = 'target';
  let maxDist = -1;

  for (const axis of axes) {
    const val = profile[axis] ?? 5;
    const dist = Math.abs(val - 5);
    if (dist > maxDist) {
      maxDist = dist;
      dominant = axis;
    }
  }

  const info = STAGE_ROLES[dominant];
  const axisLabels: Record<DecisionAxisKey, string> = {
    target: '공격 대상 (Target)',
    affection: '애정 여부 (Affection)',
    mask: '표정/태도 (Mask)',
    pace: '반응 속도감 (Pace)',
  };

  return {
    axis_key: dominant,
    label: axisLabels[dominant],
    stage_role: info.role,
    distance: maxDist,
  };
}

/**
 * AxisProfile에서 직접 type_code + 주도축 + axis_profile JSONB를 생성해
 * DB 저장용 객체를 반환한다.
 */
export function buildAxisDbFields(profile: AxisProfile): {
  axis_profile: AxisProfile;
  type_code: string;
  dominant_axis: ReturnType<typeof calculateDominantAxis>;
} {
  return {
    axis_profile: profile,
    type_code: generateTypeCode(profile),
    dominant_axis: calculateDominantAxis(profile),
  };
}

// ──────────────────────────────────────────────
// 단위 테스트 (런타임에서도 호출 가능한 형태)
// ──────────────────────────────────────────────
export function runTypeCodeTests(): { passed: number; failed: number; errors: string[] } {
  const errors: string[] = [];
  let passed = 0;

  function assert(label: string, actual: unknown, expected: unknown) {
    if (JSON.stringify(actual) === JSON.stringify(expected)) {
      passed++;
    } else {
      errors.push(`FAIL [${label}]: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }

  // quantizeAxis
  assert('quantize 0',  quantizeAxis(0),  1);
  assert('quantize 3',  quantizeAxis(3),  1);
  assert('quantize 4',  quantizeAxis(4),  2);
  assert('quantize 6',  quantizeAxis(6),  2);
  assert('quantize 7',  quantizeAxis(7),  3);
  assert('quantize 10', quantizeAxis(10), 3);

  // generateTypeCode
  assert('typeCode all-low',  generateTypeCode({ target:0, affection:0, mask:0, pace:0 }),  'T1A1M1P1');
  assert('typeCode all-mid',  generateTypeCode({ target:5, affection:5, mask:5, pace:5 }),  'T2A2M2P2');
  assert('typeCode all-high', generateTypeCode({ target:10, affection:10, mask:10, pace:10 }), 'T3A3M3P3');
  assert('typeCode mixed',    generateTypeCode({ target:3, affection:7, mask:5, pace:9 }),  'T1A3M2P3');

  // parseTypeCode
  assert('parse valid',    parseTypeCode('T2A3M1P3'), { target:2, affection:3, mask:1, pace:3 });
  assert('parse invalid',  parseTypeCode('INVALID'),  null);

  // typeCodeDistance
  assert('distance same',     typeCodeDistance('T1A1M1P1', 'T1A1M1P1'), 0);
  assert('distance opposite', typeCodeDistance('T1A1M1P1', 'T3A3M3P3'), 8);
  assert('distance mixed',    typeCodeDistance('T1A2M3P1', 'T2A2M2P2'), 3);

  return { passed, failed: errors.length, errors };
}
