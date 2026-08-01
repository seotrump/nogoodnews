import { createClient } from '@supabase/supabase-js';
import { generateEnforcedAIContent } from './ai-core';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://missing-url',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'missing-key'
);

export interface ValidationRuleResult {
  rule_key: string;
  rule_label: string;
  passed: boolean;
  reason: string;
  severity: 'block' | 'warn';
}

export interface ValidationOutput {
  passed: boolean;
  results: ValidationRuleResult[];
}

/**
 * 봇의 persona_prompt나 사이트 설정 프롬프트와 완전히 독립되어 무조건 실행되는 콘텐츠 가이드라인 검증 함수
 */
export async function validateContent(post: {
  headline: string;
  content: string;
  sourceUrl?: string | null;
  sensitivityTag?: 'normal' | 'sensitive';
  sensitivityReason?: string | null;
}): Promise<ValidationOutput> {
  const results: ValidationRuleResult[] = [];
  let overallPassed = true;

  try {
    // 1. moderation_rules 테이블에서 활성화(is_active = true) 상태인 검증 규칙 전체 조회
    const { data: rules, error } = await supabaseAdmin
      .from('moderation_rules')
      .select('*')
      .eq('is_active', true);

    if (error || !rules || rules.length === 0) {
      console.warn('[content-validator] moderation_rules 조회 실패 또는 등록된 규칙이 없음. 기본 통과 처리:', error);
      return { passed: true, results: [] };
    }

    // 2. 각 활성화된 규칙을 깨끗한(Clean) 독립 LLM 호출로 검증
    for (const rule of rules) {
      const prompt = `[독립 콘텐츠 가이드라인 검증기]
당신은 엄격하고 객관적인 커뮤니티 콘텐츠 모더레이터입니다.
이 검증은 작성자 봇의 캐릭터 성격이나 말투와 관계없이 오직 안전 가이드라인 준수 여부만 판단합니다.

[검증 대상 피드]
- 제목: ${post.headline}
- 본문 내용: ${post.content}
- 원본 뉴스 링크: ${post.sourceUrl || '없음'}
- 뉴스 민감도 태그: ${post.sensitivityTag || 'normal'} ${post.sensitivityReason ? `(사유: ${post.sensitivityReason})` : ''}

[평가 가이드라인 규칙]
- 규칙 명칭: ${rule.rule_label} (${rule.rule_key})
- 심사 판단 기준: "${rule.rule_prompt}"

[지시 사항]
위 검증 대상 피드가 해당 판단 기준을 위반했는지 검사하세요.
- 위반 사항이 없고 안전하다면 passed: true
- 위반했거나 가이드라인에 위배된다면 passed: false 및 구체적 사유 작성

반드시 아래 JSON 형식으로만 응답하세요:
{
  "passed": true 또는 false,
  "reason": "한 줄 명확한 판정 사유"
}`;

      try {
        const rawResponse = await generateEnforcedAIContent(prompt, 'gemini-3.5-flash-lite');
        let cleaned = rawResponse || '';
        if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\n?/, '').replace(/\n?```$/, '');

        const parsed = JSON.parse(cleaned);
        const rulePassed = parsed.passed === true;

        results.push({
          rule_key: rule.rule_key,
          rule_label: rule.rule_label,
          passed: rulePassed,
          reason: parsed.reason || (rulePassed ? '규칙 준수' : '가이드라인 위반'),
          severity: rule.severity || 'block'
        });

        if (!rulePassed && rule.severity === 'block') {
          overallPassed = false;
        }
      } catch (err: any) {
        console.error(`[content-validator] 규칙 (${rule.rule_key}) 검증 중 에러:`, err);
        results.push({
          rule_key: rule.rule_key,
          rule_label: rule.rule_label,
          passed: true,
          reason: `검증 처리 중 오류 발생 (자동 통과): ${err.message}`,
          severity: rule.severity || 'block'
        });
      }
    }

    return {
      passed: overallPassed,
      results
    };
  } catch (globalErr: any) {
    console.error('[content-validator] 치명적 검증 파이프라인 에러:', globalErr);
    return {
      passed: true,
      results: []
    };
  }
}
