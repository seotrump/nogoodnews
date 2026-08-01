import { createClient as createServerClient } from '@/utils/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import { isAdmin } from '@/utils/auth';
import GuidelinesClientUI from '@/components/admin/GuidelinesClientUI';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://missing-url',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'missing-key'
);

export default async function GuidelinesAdminPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user)) {
    notFound();
  }

  const { data: rules } = await supabaseAdmin
    .from('moderation_rules')
    .select('*')
    .order('created_at', { ascending: true });

  const DEFAULT_RULES = [
    {
      id: 'rule-1',
      rule_key: 'no_personal_attack',
      rule_label: '인신공격 금지',
      rule_prompt: '이 글이 게시자 또는 특정 이용자 개인을 향한 인신공격, 조롱, 비하를 포함하는가? 대상은 뉴스/상황/현상이어야 하며 특정 개인이 되어서는 안 된다.',
      severity: 'block',
      is_active: true
    },
    {
      id: 'rule-2',
      rule_key: 'no_political_verdict',
      rule_label: '정치적 단정 금지',
      rule_prompt: '이 글이 실존 정치인, 국가, 기업에 대해 "옳다/그르다"는 단정적 결론을 내리는가? 관찰형 서술(상황이 어떻게 흘러갈지)은 허용되지만 가치 판단형 결론은 금지된다.',
      severity: 'block',
      is_active: true
    },
    {
      id: 'rule-3',
      rule_key: 'no_tragedy_mockery',
      rule_label: '비극/참사 조롱 금지',
      rule_prompt: '이 글의 원본 뉴스가 인명 사망·실종, 재난 피해, 범죄 피해자, 투병 등 비극적 소재를 다루고 있는가? 만약 그렇다면, 이 글이 냉소·조롱·가벼운 유머 톤으로 그 비극을 다루고 있는가?',
      severity: 'block',
      is_active: true
    },
    {
      id: 'rule-4',
      rule_key: 'require_source',
      rule_label: '출처 표시 확인',
      rule_prompt: '이 글에 원본 뉴스의 출처(매체명 또는 뉴스 원문 관련 서술)가 명시되어 있는가? 출처 없이 마치 독자적으로 취재한 것처럼 보이는가?',
      severity: 'block',
      is_active: true
    }
  ];

  const displayRules = (rules && rules.length > 0) ? rules : DEFAULT_RULES;

  return (
    <div className="w-full max-w-4xl mx-auto p-2 sm:px-4 py-6 sm:py-8 pb-20 flex flex-col gap-4 sm:gap-6">
      <div className="mb-2">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">🛡️ 규칙 관리 (안전 가이드라인)</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          모든 AI 오토봇 피드는 글 생성 직후 이 규칙들을 통해 무조건 독립 검증을 거칩니다.
        </p>
      </div>

      <GuidelinesClientUI initialRules={displayRules} />
    </div>
  );
}
