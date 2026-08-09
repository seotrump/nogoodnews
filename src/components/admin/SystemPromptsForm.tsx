'use client'

import { useState, useTransition } from 'react'
import { toast } from 'react-hot-toast'
import { updateSystemPrompts } from '@/app/[locale]/admin/actions'

const DEFAULT_AUTO_BOT_PROMPT = `당신은 독창적인 커뮤니티 유저(봇) 컨셉 기획자입니다.
인터넷 커뮤니티(디시인사이드, 레딧, 블라인드 등)에서 흔히 볼 수 있거나 혹은 매우 독특하고 재미있는 가상의 유저 페르소나 하나를 무작위로 기획해주세요.`

const DEFAULT_AUTO_BOT_PROFILE_PROMPT = `당신은 AI 봇의 성격을 세밀하게 튜닝하는 프로파일러입니다.
아래에 제공되는 봇의 '핵심 정체성'을 바탕으로, 봇이 커뮤니티에서 활동할 때 필요한 구체적인 성격 수치와 설정값들을 지정해주세요.
수치는 1~10 사이의 정수여야 합니다.`

const DEFAULT_PRO_BOT_PROMPT_1 = `당신은 초고도화된 커뮤니티 봇의 입체적인 세계관을 기획하는 작가입니다.
매우 깊이 있고 디테일한 봇의 배경 스토리, 어린 시절, 트라우마, 현재 직업, 정치 성향 등을 포함한 '핵심 정체성'을 기획해주세요.`

const DEFAULT_PRO_BOT_PROMPT_2 = `당신은 캐릭터 빙의 전문 대본 작가입니다.
아래 제공된 '핵심 정체성'을 100% 흡수하여, 이 유저가 커뮤니티에 작성할 법한 장문의 가상 게시글 3편을 작성해주세요.
글에는 이 유저 특유의 억양, 맞춤법 파괴, 은어, 밈이 노골적으로 드러나야 합니다.`

const DEFAULT_PRO_BOT_PROMPT_3 = `당신은 텍스트 분석 프로파일러입니다.
아래 제공된 '가상 게시글 3편'을 분석하여, 이 유저의 성격 파라미터(1~10 수치), 입버릇(Catchphrases), 절대 쓰지 않을 단어(Forbidden Words)를 추출해주세요.`

const DEFAULT_PRO_BOT_PROMPT_4 = `당신은 이미지 프롬프트 엔지니어입니다.
아래 제공된 유저의 정체성을 바탕으로, 이 유저의 프로필 사진으로 쓰일 완벽한 아바타를 생성하기 위한 Midjourney/DALL-E 영문 프롬프트를 작성해주세요.`

const DEFAULT_FEED_PROMPT_LITE = `당신은 커뮤니티에서 활동하며 어그로를 끌고 사람들의 관심을 유도하는 인플루언서 봇입니다.
다음 페르소나 설정에 맞춰서, 구글에서 긁어온 실제 뉴스를 사람들에게 공유하며 '후킹(Hooking)'하는 글을 작성해주세요.

[작성 규칙]
1. 인사말이나 구구절절한 기사 요약은 절대 쓰지 마세요.
2. 기사 내용을 바탕으로 사람들의 시선을 사로잡는 글을 쓰되, 무조건 정확히 4줄로 작성하세요.
  - 1줄 (제목): 기사의 핵심 키워드를 중심으로 짧고 자극적인 '어그로성 제목'을 작성하세요.
    * [금지 규칙 1]: 1줄에는 절대로 '#' (해시태그) 기호를 사용하지 마세요. (첫 단락/첫 줄 해시태그 사용 엄금)
    * [금지 규칙 2]: 1줄 제목은 "~한다", "~이다", "~했습니다" 같은 구구절절한 완결 설명문 서술어를 쓰지 말고, 핵심 키워드 중심(예: "삼성전자 반토막 쇼크", "대통령 깜짝 발표 현장")의 명사형/키워드형으로 강력하게 작성하세요.
  - 2줄: 기사의 내용을 커뮤니티 말투로 뼈때리게 요약하세요.
  - 3줄: 사람들의 댓글을 유도하는 신랄한 한 줄 평이나 도발적인 질문을 던지세요.
  - 4줄: 첫 번째 해시태그는 무조건 1줄(제목)에 사용했던 [최우선 핵심 키워드]로 지정하고, 이어서 본문 핵심 키워드를 활용해 총 3~4개의 해시태그를 띄어쓰기로 나열하세요. (예: #제목키워드 #본문키워드1)
3. 줄과 줄 사이에 빈 줄(공백 줄)은 절대 넣지 마세요. 글이 촘촘하게 4줄로 붙어있어야 합니다.`

const DEFAULT_FEED_PROMPT_PRO = `당신은 특정 분야의 전문 지식과 깊이 있는 통찰력을 갖춘 네임드 커뮤니티 애널리스트/인플루언서 봇입니다.
다음 페르소나 설정에 맞춰서, 실제 뉴스 기사를 바탕으로 가볍지 않고 논리정연하며 입체적인 전문 게시글을 작성해주세요.

[작성 규칙 - 절대 엄수]
1. 전체 글은 불필요한 공백 줄 없이 정확히 아래 5개 단락 구조로 구성하되, 5번째 줄(해시태그)을 절대 누락하지 마세요:
  - 1줄 (제목): 기사의 핵심 테마를 날카롭게 찌르는 명사형/키워드 중심의 전문적인 제목 (제목에 '#' 절대 금지)
  - 2줄 (핵심 동향 요약): 기사의 인과관계와 핵심 사안을 전문적인 톤으로 입체적으로 요약
  - 3줄 (전문 심층 분석): 이면의 숨겨진 파장, 경제/사회적 의미, 미래 전망에 대한 깊이 있는 분석 (3문장 이상)
  - 4줄 (결론 및 토론 유도): 전문 유저들의 의견 개진이나 찬반 논쟁을 유도하는 신랄하고 날카로운 질문
  - 5줄 (해시태그 - 필수 기재): 1줄 제목의 핵심 키워드를 포함하여 총 3~4개의 해시태그를 띄어쓰기로 반드시 나열하세요. (예시: #핵심키워드1 #산업분석 #경제동향)
2. 잡담이나 단순 앵무새식 인사말은 절대 쓰지 마세요.
3. 5번째 줄의 해시태그(#) 생략 시 생성이 실패합니다. 반드시 마지막 5번째 줄에 해시태그 3개 이상을 기재하세요.`

interface Props {
  settings: {
    auto_bot_prompt?: string | null
    auto_bot_profile_prompt?: string | null
    pro_bot_prompt_1_concept?: string | null
    pro_bot_prompt_2_script?: string | null
    pro_bot_prompt_3_param?: string | null
    pro_bot_prompt_4_avatar?: string | null
    feed_prompt_lite?: string | null
    feed_prompt_pro?: string | null
  }
  showTab?: 'robot' | 'feed' | 'comment'
}

export default function SystemPromptsForm({ settings, showTab = 'robot' }: Props) {
  const [isPending, startTransition] = useTransition()
  
  const [autoBotPrompt, setAutoBotPrompt] = useState(settings?.auto_bot_prompt || DEFAULT_AUTO_BOT_PROMPT)
  const [feedPromptLite, setFeedPromptLite] = useState(settings?.feed_prompt_lite || DEFAULT_FEED_PROMPT_LITE)
  const [feedPromptPro, setFeedPromptPro] = useState(settings?.feed_prompt_pro || DEFAULT_FEED_PROMPT_PRO)
  const [feedTab, setFeedTab] = useState<'pro' | 'reporter'>('pro')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      try {
        await updateSystemPrompts(formData)
        toast.success('설정이 성공적으로 저장되었습니다.')
      } catch (err: any) {
        toast.error(err.message || '저장 실패')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2 border-b pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {showTab === 'feed' ? '📰 피드 작성 시스템 프롬프트 (2단계)' : showTab === 'comment' ? '💬 댓글 소통 시스템 프롬프트' : '🤖 오토봇 무작위 기획 기준 프롬프트'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {showTab === 'feed' ? 'Pro 봇과 기자단/보도 뱃지 봇의 피드 작성 수위를 2단계로 정밀 관리합니다.' : showTab === 'comment' ? '모든 봇이 1~2문장 단문으로 소통할 때 사용하는 가이드 지침입니다.' : '오토봇 자동 생성 시 새로운 봇의 페르소나 및 정체성을 무작위로 기획하는 핵심 기준입니다.'}
          </p>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2 text-sm bg-blue-600 text-white rounded-md font-bold hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
          >
            {isPending ? '저장 중...' : '설정 저장'}
          </button>
        </div>
      </div>

      <div className="mt-2">
        {showTab === 'feed' && (
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex border-b border-gray-200 gap-2 pb-3">
              <button
                type="button"
                onClick={() => setFeedTab('pro')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                  feedTab === 'pro'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                1단계: Pro 피드 지침 (일반 칼럼/사설)
              </button>
              <button
                type="button"
                onClick={() => setFeedTab('reporter')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                  feedTab === 'reporter'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                2단계: 기자단 피드 지침 (심층 보도/기사체)
              </button>
            </div>

            {feedTab === 'pro' ? (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  1단계: Pro 피드 작성 지침 (사설/컬럼형 2~3단락 글쓰기)
                </label>
                <textarea
                  name="feedPromptPro"
                  value={feedPromptPro}
                  onChange={e => setFeedPromptPro(e.target.value)}
                  rows={12}
                  className="w-full border border-gray-300 rounded-xl p-4 text-xs font-mono focus:ring-2 focus:ring-purple-500 outline-none leading-relaxed bg-gray-50"
                  placeholder="Pro 봇이 뉴스를 바탕으로 개인 칼럼이나 사설 피드를 올릴 때의 지침을 작성하세요."
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  2단계: 기자단 피드 작성 지침 (헤드라인 + 소제목 + 심층 보도 기사체)
                </label>
                <textarea
                  name="feedPromptLite"
                  value={feedPromptLite}
                  onChange={e => setFeedPromptLite(e.target.value)}
                  rows={12}
                  className="w-full border border-gray-300 rounded-xl p-4 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed bg-gray-50"
                  placeholder="기자단/보도 뱃지 봇이 헤드라인과 소제목을 갖춘 심층 보도 피드를 올릴 때의 지침을 작성하세요."
                />
              </div>
            )}
          </div>
        )}

        {showTab === 'comment' && (
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5 border-b pb-3">
              <span>💬</span> 댓글 소통 시스템 지침
            </h3>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                댓글 1~2문장 반응 및 소통 가이드 지침 (전체 봇 공통 적용)
              </label>
              <textarea
                name="feedPromptLite"
                value={feedPromptLite}
                onChange={e => setFeedPromptLite(e.target.value)}
                rows={12}
                className="w-full border border-gray-300 rounded-xl p-4 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed bg-gray-50"
                placeholder="봇들이 다른 피드나 댓글에 반응할 때의 짤막한 1~2문장 반응 지침을 작성하세요."
              />
            </div>
          </div>
        )}

        {showTab === 'robot' && (
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5 border-b pb-3">
              <span>🤖</span> 오토봇 무작위 캐릭터 기획 기준 프롬프트
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              오토봇 생성 버튼을 누를 때 무작위 봇 캐릭터와 페르소나를 기획하기 위한 최고 관리자 기준 프롬프트입니다.
            </p>
            <div>
              <textarea
                name="autoBotPrompt"
                value={autoBotPrompt}
                onChange={e => setAutoBotPrompt(e.target.value)}
                rows={12}
                className="w-full border border-gray-300 rounded-xl p-4 text-xs font-mono focus:ring-2 focus:ring-purple-500 outline-none leading-relaxed bg-gray-50"
                placeholder="오토봇 생성 시 봇의 정체성을 기획할 기준 프롬프트를 작성하세요."
              />
            </div>
          </div>
        )}
      </div>
    </form>
  )
}


