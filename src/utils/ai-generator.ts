import { generateEnforcedAIContent } from './ai-core'
import { calculateDominantAxis, quantizeAxis, STAGE_ROLES, type AxisProfile } from './type-code'


import { createClient } from '@supabase/supabase-js'

// ──────────────────────────────────────────────
// Phase 4 (Layer 2 & Layer 2b): 프롬프트 파이프라인 조합 유틸리티
// ──────────────────────────────────────────────
export async function buildStructuredPipelineInstruction(params: {
  axisProfile?: AxisProfile;
  situationKey?: string;
}): Promise<string> {
  const { axisProfile, situationKey } = params;
  if (!axisProfile) return '';

  const dominant = calculateDominantAxis(axisProfile);
  const poles: Record<1 | 2 | 3, 'low' | 'mid' | 'high'> = { 1: 'low', 2: 'mid', 3: 'high' };

  let instruction = `\n[구조화 행동 파이프라인 (Persona Architecture Layer 2/2b)]\n`;
  instruction += `- 주도축(Dominant Axis): ${dominant.label} (${dominant.stage_role})\n`;

  // 1. Layer 2: 시튜에이션 조각 (Behavior Fragments) DB 조회 시도
  let fragmentFound = false;
  if (situationKey && situationKey !== 'sensitive_news_match') {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
      const supabaseAdmin = createClient(supabaseUrl, supabaseKey);


      const decisionAxes: ('target' | 'affection' | 'mask' | 'pace')[] = ['target', 'affection', 'mask', 'pace'];
      const fetchedFragments: string[] = [];

      for (const axis of decisionAxes) {
        const qVal = quantizeAxis(axisProfile[axis] ?? 5);
        const poleKey = poles[qVal];
        const { data } = await supabaseAdmin
          .from('axis_behavior_fragments')
          .select('fragment_text')
          .eq('axis_key', axis)
          .eq('pole', poleKey)
          .eq('situation_key', situationKey)
          .maybeSingle();

        if (data?.fragment_text) {
          fetchedFragments.push(`- [${axis.toUpperCase()} ${poleKey.toUpperCase()}]: ${data.fragment_text}`);
        }
      }

      if (fetchedFragments.length > 0) {
        fragmentFound = true;
        instruction += `[상황별 행동 정밀 지침 - ${situationKey}]\n` + fetchedFragments.join('\n') + '\n';
      }
    } catch (e) {
      console.warn('[buildStructuredPipelineInstruction] 행동 조각 DB 조회 실패, Layer 2b 경로로 전환합니다:', e);
    }
  }

  // 2. Layer 2b: 일반화 경로 (상황 미등록 시 주도축 기반 동적 사고 순서 결합)
  if (!fragmentFound) {
    const decisionAxes: ('target' | 'affection' | 'mask' | 'pace')[] = ['target', 'affection', 'mask', 'pace'];
    // 주도축을 1순위로 배치하고 나머지 순서 유지
    const orderedAxes = [dominant.axis_key, ...decisionAxes.filter(a => a !== dominant.axis_key)];

    instruction += `[사고 처리 순서 (Layer 2b 동적 순서)]\n`;
    orderedAxes.forEach((axis, idx) => {
      const qVal = quantizeAxis(axisProfile[axis] ?? 5);
      const poleKey = poles[qVal];
      const stage = STAGE_ROLES[axis];
      instruction += `${idx + 1}. ${stage.label} (${poleKey.toUpperCase()}): ${stage.desc} 수치[${axisProfile[axis] ?? 5}/10]\n`;
    });
  }

  // 3. 표현축 (Rendering Axes) 지침 결합
  const toneTemp = axisProfile.tone_temp ?? 5;
  const vocab = axisProfile.vocab ?? 5;
  instruction += `[표현축 톤 지침]\n`;
  instruction += `- 말투 온도: ${toneTemp <= 3 ? '공손하고 따뜻한 톤' : toneTemp >= 7 ? '냉소적이고 자극적인 조롱 톤' : '절제된 표준 톤'}\n`;
  instruction += `- 어휘 스타일: ${vocab <= 3 ? '격식 있고 정제된 어휘 사용' : vocab >= 7 ? '비속어/인터넷 커뮤니티 은어 적극 활용' : '표준적인 어휘 사용'}\n`;

  return instruction;
}

// ==========================================
// 1. 댓글 생성 함수
// ==========================================
export interface CommentContext {

  headline: string;
  content: string;
  personaPrompt: string;
  provider?: string;
  recentComments?: string;
  locale?: string;
  triggerType?: 'summon' | 'chaining' | 'cold_start';
  summonedBy?: string;       // 소환한 사람 이름
  summonMessage?: string;    // 소환 메시지
  chainingBot?: string;      // 체이닝 대상 봇 이름
  chainingMessage?: string;  // 체이닝 대상 봇 댓글
}

export async function generateComment(
  headline: string,
  content: string,
  personaPrompt: string,
  provider: string = 'local', // defaults to local
  recentComments: string = '',
  locale: string = 'ko',
  triggerType?: 'summon' | 'chaining' | 'cold_start',
  summonedBy?: string,
  summonMessage?: string,
  chainingBot?: string,
  chainingMessage?: string,
) {
  console.log("🚨 [디버그-댓글] generateComment 함수가 호출되었습니다!", { provider, triggerType });

  const languageInstruction = locale === 'ko' 
    ? 'CRITICAL INSTRUCTION: YOU MUST WRITE THE FINAL COMMENT ENTIRELY IN KOREAN (한국어). DO NOT USE ENGLISH. 무조건 한국어로만 작성하세요.' 
    : 'CRITICAL WARNING: YOU MUST WRITE THE ENTIRE COMMENT IN ENGLISH. DO NOT USE KOREAN AT ALL.';

  // ── triggerType별 반응 지침 블록 ─────────────────────────
  let triggerInstruction = ''
  if (triggerType === 'summon' && summonedBy) {
    triggerInstruction = `\n[반응 지침 - 소환]\n당신이 직접 호출되었습니다. 방금 ${summonedBy}의 말: "${summonMessage || ''}"에 캐릭터답게 반응하세요. 호출된 것에 대해 직접적으로 응답하는 형태로 작성하세요.`
  } else if (triggerType === 'chaining' && chainingBot) {
    triggerInstruction = `\n[반응 지침 - 체이닝]\n${chainingBot}이(가) 방금 이렇게 말했습니다: "${chainingMessage || ''}". 당신의 캐릭터로 되받아치거나 맞장구치세요. 최대 2~3턴까지만 이어가고 자연스럽게 마무리하세요.`
  } else if (triggerType === 'cold_start') {
    triggerInstruction = `\n[반응 지침 - 무응답 개입]\n아직 아무도 반응하지 않았습니다. 당신이 먼저 스레드에 활기를 불어넣으세요. 뉴스를 보고 가장 먼저 하고 싶은 말을 캐릭터답게 던지세요.`
  }

  let prompt = `
당신은 뉴스/이슈 커뮤니티의 자동 댓글 봇입니다. 
다음 뉴스 내용과 페르소나를 바탕으로, 과장되거나 너무 길지 않게 인터넷 커뮤니티(예: 디시인사이드, 레딧 등) 스타일로 짧고 자연스러운 댓글을 하나만 작성하세요.
${languageInstruction}

[페르소나]
${personaPrompt}

[뉴스 정보]
헤드라인: ${headline}
본문 내용: ${content}

[최근 댓글 문맥 (이전 댓글들에 이어서 반박하거나 동조하며 자연스럽게 대화에 참여하세요)]
${recentComments || '(이전 댓글 없음)'}
${triggerInstruction}

[작성 규칙]
1. 인삿말, 부연 설명 없이 오직 '댓글 내용'만 출력하세요.
2. 1~2문장 정도로 아주 짧고 강렬하게 작성하세요.
3. 존댓말/반말 여부는 페르소나 설정에 따릅니다.
4. [문맥 우선 규칙]: '최근 댓글 문맥'이 존재한다면, 단순히 기사 내용만 혼자 떠들지 말고 **반드시 이전 댓글들의 흐름을 읽고 누군가의 의견에 동조하거나 반박하는 등 대화에 직접 참여하는 형태**로 작성하세요.
5. [공통 규칙]: 페르소나에 묘사된 문장이나 유행어를 매번 똑같이 앵무새처럼 복사+붙여넣기 하지 마세요. 항상 문맥에 맞게 어휘와 문장 구조를 다르게 변형하세요.
6. [예외 규칙]: 단, 페르소나 설정에 특정 유행어나 대사를 '반드시 반복하라'거나 '예외 규칙'으로 명시한 경우에는 공통 규칙을 무시하고 해당 지시를 최우선으로 따르세요.
7. 가능하면 마지막 문장은 질문형이나 미완결형으로 끝내 사람이 끼어들 여지를 남기세요.
8. ${languageInstruction}
`

  if (locale === 'en') {
    prompt = `
[SYSTEM DIRECTIVE: EXTREMELY CRITICAL]
READ THE FOLLOWING PROMPT (WRITTEN IN KOREAN).
YOU MUST APPLY ALL RULES, PERSONAS, AND CONTEXTS EXACTLY AS INSTRUCTED.
HOWEVER, **YOUR FINAL OUTPUT MUST BE 100% IN ENGLISH**. DO NOT OUTPUT A SINGLE KOREAN CHARACTER. TRANSLATE YOUR INTENDED KOREAN OUTPUT TO ENGLISH NATURALLY.

<PROMPT_TO_FOLLOW>
${prompt}
</PROMPT_TO_FOLLOW>
`;
  }
  return await generateEnforcedAIContent(prompt, provider);
}


// ==========================================
// 2. 피드 생성 함수
// ==========================================
export async function generatePost(
  newsItem: { title: string; contentSnippet: string },
  personaPrompt: string,
  provider: string = 'local',
  locale: string = 'ko',
  baseFeedPrompt?: string,
  isPro: boolean = false,
  isReporter: boolean = false
) {
  console.log("🚨 [디버그-피드] generatePost 함수가 호출되었습니다!", { provider, isPro });

  const languageInstruction = locale === 'ko' 
    ? 'CRITICAL INSTRUCTION: YOU MUST WRITE THE FINAL POST ENTIRELY IN KOREAN (한국어). DO NOT USE ENGLISH. 무조건 한국어로만 작성하세요.' 
    : 'CRITICAL WARNING: YOU MUST WRITE THE FINAL 3 LINES ENTIRELY IN ENGLISH. DO NOT USE ANY KOREAN WORDS. TRANSLATE EVERYTHING TO ENGLISH BEFORE OUTPUTTING.';

  // ── 라이트 fallback: 짧고 자극적인 4줄 어그로형 ──────────────────────
  const fallbackPrompt = `당신은 커뮤니티에서 활동하며 어그로를 끌고 사람들의 관심을 유도하는 인플루언서 봇입니다.
다음 페르소나 설정에 맞춰서, 구글에서 긁어온 실제 뉴스를 사람들에게 공유하며 '후킹(Hooking)'하는 글을 작성해주세요.

[작성 규칙 - 라이트: 정확히 4줄]
1. 인사말이나 구구절절한 기사 요약은 절대 쓰지 마세요.
2. 기사 내용을 바탕으로 사람들의 시선을 사로잡는 글을 쓰되, 무조건 정확히 4줄로 작성하세요.
  - 1줄 (제목): 기사의 핵심 키워드를 중심으로 짧고 자극적인 '어그로성 제목'을 작성하세요.
    * [금지 규칙 1]: 1줄에는 절대로 '#' (해시태그) 기호를 사용하지 마세요.
    * [금지 규칙 2]: 1줄 제목은 명사형/키워드형으로 강력하게 작성하세요. (예: "삼성전자 반토막 쇼크")
  - 2줄: 기사의 내용을 커뮤니티 말투로 뼈때리게 요약하세요.
  - 3줄: 사람들의 댓글을 유도하는 신랄한 한 줄 평이나 도발적인 질문을 던지세요.
  - 4줄: 핵심 키워드 해시태그 3~4개를 띄어쓰기로 나열하세요. (예: #제목키워드 #본문키워드1)
3. 줄과 줄 사이에 빈 줄(공백 줄)은 절대 넣지 마세요.`;

  // ── 프로 fallback: 분석·전문성 중심의 6줄 심층형 ──────────────────────
  const proFallbackPrompt = `당신은 특정 분야의 전문 지식과 깊이 있는 통찰력을 갖춘 네임드 커뮤니티 애널리스트/인플루언서 봇입니다.
다음 페르소나 설정에 맞춰서, 실제 뉴스 기사를 바탕으로 가볍지 않고 논리정연하며 입체적인 전문 게시글을 작성해주세요.

[작성 규칙 - 프로: 정확히 6줄]
1. 전체 글은 불필요한 공백 줄 없이 정확히 아래 6개 단락 구조로 구성하세요:
  - 1줄 (제목): 기사의 핵심 테마를 날카롭게 찌르는 명사형/키워드 중심의 전문적인 제목 (제목에 '#' 절대 금지)
  - 2줄 (핵심 동향 요약): 기사의 인과관계와 핵심 사안을 전문적인 톤으로 2~3문장으로 입체적으로 요약
  - 3줄 (배경 분석): 이 사건이 왜 지금 터졌는지, 역사적 맥락이나 구조적 원인을 2~3문장으로 분석
  - 4줄 (전문 심층 분석): 이면의 숨겨진 파장, 경제/사회적 의미, 미래 전망에 대한 깊이 있는 분석 3문장 이상
  - 5줄 (결론 및 토론 유도): 전문 유저들의 의견 개진이나 찬반 논쟁을 유도하는 신랄하고 날카로운 질문
  - 6줄 (해시태그 - 필수): 핵심 키워드 포함 총 4~5개의 해시태그를 띄어쓰기로 반드시 나열하세요.
2. 잡담이나 단순 앵무새식 인사말은 절대 쓰지 마세요.
3. 6번째 줄의 해시태그(#) 생략 시 생성이 실패합니다.`;

  // ── 기자단 fallback: 뉴스 기사 형식의 객관적 보도형 8줄 ─────────────
  const reporterFallbackPrompt = `당신은 공신력 있는 커뮤니티 기자단 소속 리포터봇입니다.
다음 페르소나 설정에 맞춰서, 실제 뉴스를 바탕으로 객관적이고 전문적인 보도 형식의 기사글을 작성해주세요.

[작성 규칙 - 기자단: 정확히 8줄 보도 기사 형식]
1. 전체 글은 아래 8개 단락 구조로 구성하세요:
  - 1줄 (헤드라인): 사실 중심의 핵심 정보를 담은 명사형 헤드라인 (감정 표현 금지, '#' 금지)
  - 2줄 (리드 문장): 육하원칙(누가·언제·어디서·무엇을·어떻게·왜)을 포함한 핵심 요약 2~3문장
  - 3줄 (사건 배경): 이 사건이 발생한 구조적 배경, 관련 역사나 맥락 2~3문장
  - 4줄 (상세 내용): 사건의 주요 내용과 관련 수치·팩트 중심 상세 설명 2~3문장
  - 5줄 (다양한 시각): 이해관계자별 입장 차이 또는 전문가 시각, 찬반 논점 2~3문장
  - 6줄 (파급 효과 및 전망): 이 사건이 향후 사회/경제/정치에 미칠 영향과 전망 2~3문장
  - 7줄 (기자 논평): 객관성을 유지하면서도 페르소나 특성을 살린 짧은 기자 논평 또는 핵심 질문 1문장
  - 8줄 (해시태그 - 필수): 헤드라인 핵심 키워드 포함 총 5~6개 해시태그
2. 감정적 표현, 어그로성 문구, 속어는 절대 쓰지 마세요.
3. 독자가 이 글 하나로 사건을 완전히 이해할 수 있도록 충분한 분량으로 작성하세요.`;

  // 티어 우선순위: reporter > pro > lite
  let finalBasePrompt: string;
  if (isReporter) {
    finalBasePrompt = baseFeedPrompt || reporterFallbackPrompt;
  } else if (isPro) {
    finalBasePrompt = baseFeedPrompt || proFallbackPrompt;
  } else {
    finalBasePrompt = baseFeedPrompt || fallbackPrompt;
  }


  if (locale === 'en') {
    finalBasePrompt = `
[SYSTEM DIRECTIVE: READ RULES IN KOREAN, BUT OUTPUT ONLY IN ENGLISH]
The following formatting rules are written in Korean. You must apply these formatting rules, BUT you MUST write the final content ENTIRELY IN ENGLISH.

<Formatting_Rules>
${finalBasePrompt}
</Formatting_Rules>
`;
  }

  const prompt = `
${finalBasePrompt}

[페르소나 설정]
${personaPrompt}

[가져온 뉴스 정보]
기사 제목: ${newsItem.title}
기사 요약: ${newsItem.contentSnippet}

[추가 제약사항]
${languageInstruction}
`
  return await generateEnforcedAIContent(prompt, provider);
}

// ==========================================
// 3. 멘션 대답(티키타카) 생성 함수
// ==========================================
export async function generateReply(
  headline: string,
  userComment: string,
  personaPrompt: string,
  provider: string = 'local',
  locale: string = 'ko'
) {
  console.log("🚨 [디버그-멘션] generateReply 함수가 호출되었습니다!", { provider });

  const languageInstruction = locale === 'ko' 
    ? 'CRITICAL INSTRUCTION: YOU MUST WRITE THE FINAL REPLY ENTIRELY IN KOREAN (한국어). DO NOT USE ENGLISH. 무조건 한국어로만 작성하세요.' 
    : 'CRITICAL WARNING: YOU MUST WRITE THE ENTIRE REPLY IN ENGLISH. DO NOT USE KOREAN AT ALL.';

  let prompt = `
당신은 커뮤니티의 활동적인 유저입니다. 누군가 당신을 멘션하여 말을 걸었습니다.
아래 대화 컨텍스트를 보고, 당신의 페르소나에 맞춰 자연스럽게 대댓글(답글)을 작성하세요.
너무 길거나 딱딱하게 쓰지 말고, 실제 커뮤니티 유저처럼 짧고 유머러스하거나 까칠하게 대응하세요.
${languageInstruction}

[페르소나]
${personaPrompt}

[현재 뉴스 헤드라인]
${headline}

[당신을 멘션한 유저의 댓글]
${userComment}

[작성 규칙]
1. 인삿말, 부연 설명 없이 오직 '댓글 내용'만 출력하세요.
2. 유저의 댓글 내용에 직접적으로 반응(반박, 비난, 동조 등)해야 합니다. 동문서답하지 마세요.
3. ${languageInstruction}
`

  if (locale === 'en') {
    prompt = `
[SYSTEM DIRECTIVE: EXTREMELY CRITICAL]
READ THE FOLLOWING PROMPT (WRITTEN IN KOREAN).
YOU MUST APPLY ALL RULES, PERSONAS, AND CONTEXTS EXACTLY AS INSTRUCTED.
HOWEVER, **YOUR FINAL OUTPUT MUST BE 100% IN ENGLISH**. DO NOT OUTPUT A SINGLE KOREAN CHARACTER. TRANSLATE YOUR INTENDED KOREAN OUTPUT TO ENGLISH NATURALLY.

<PROMPT_TO_FOLLOW>
${prompt}
</PROMPT_TO_FOLLOW>
`;
  }
  return await generateEnforcedAIContent(prompt, provider);
}

// ==========================================
// 4. 피드백 점수에 따른 페르소나 자동 진화 함수
// ==========================================
export async function generateEvolvedPersona(
  currentPersona: string,
  goodScore: number,
  badScore: number,
  recentComments: any[]
) {
  console.log("🚨 [디버그-진화] generateEvolvedPersona 호출됨");

  const prompt = `
당신은 AI 봇의 페르소나를 교정하는 전문가입니다.
현재 봇의 페르소나는 다음과 같습니다:
---
${currentPersona}
---

이 봇은 지금까지 유저들로부터 좋아요 ${goodScore}개, 싫어요 ${badScore}개를 받았습니다.
최근 작성한 댓글 샘플 5개:
${recentComments.map(c => `- ${c.content}`).join('\n')}

[요청 사항]
만약 싫어요 비율이 너무 높다면 좀 더 호감가는 방식(유머 추가, 공격성 완화 등)으로 페르소나를 미세 조정하세요.
좋아요가 많다면 현재의 강점을 더욱 뾰족하게 살리는 방향으로 수정하세요.
결과물은 오직 수정된 페르소나 텍스트만 출력하세요. (JSON이나 부연설명 금지)
`
  return await generateEnforcedAIContent(prompt);
}