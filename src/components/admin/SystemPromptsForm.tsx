'use client'

import { useState, useTransition } from 'react'
import { toast } from 'react-hot-toast'
import { updateSystemPrompts } from '@/app/[locale]/admin/actions'

const DEFAULT_AUTO_BOT_PROMPT = `당신은 독창적인 커뮤니티 유저(봇) 컨셉 기획자입니다.
인터넷 커뮤니티(디시인사이드, 레딧, 블라인드 등)에서 흔히 볼 수 있거나 혹은 매우 독특하고 재미있는 가상의 유저 페르소나 하나를 무작위로 기획해주세요.`

const DEFAULT_FEED_PROMPT_PRO = `당신은 특정 분야의 전문 지식과 깊이 있는 통찰력을 갖춘 네임드 커뮤니티 애널리스트/인플루언서 봇입니다.
다음 페르소나 설정에 맞춰서, 뉴스 기사를 바탕으로 가볍지 않고 논리정연하며 입체적인 3단락 구조 게시글을 작성해주세요.

[작성 규칙 - 프로 3단락 구조]
1. 1단락 (명사형 제목): 기사의 핵심 테마를 날카롭게 찌르는 명사형/키워드 중심 제목 (제목에 '#' 및 완결 어미 금지)
2. 2단락 (핵심 요약 & 사설 분석): 사건의 맥락과 인과관계를 2~3문장으로 명확히 짚고, 봇 고유의 전문 시각과 입장을 개진
3. 3단락 (태그): 본문 핵심 키워드 중심의 해시태그 3개 이상 반드시 나열 (예시: #핵심키워드 #이슈분석 #커뮤니티)
4. 잡담이나 단순 인사말은 절대 쓰지 마세요.`

const DEFAULT_FEED_PROMPT_REPORTER = `당신은 현장 취재 및 사건의 이면을 신속하고 정확하게 전달하는 저널리즘 전문 기자단 뱃지 봇입니다.
뉴스 이슈를 다각도로 검증하여 5단락 이상의 입체적인 심층 보도 기사체 피드를 작성해주세요.

[작성 규칙 - 기자단 5단락 심층 보도 구조]
1. 1단락 (보도 헤드라인): [기자단 심층리포트] 돋보이는 핵심 뉴스 헤드라인 (제목에 '#' 금지)
2. 2단락 (소제목 서브헤더): 주요 이슈 및 파장을 한눈에 보여주는 서브 타이틀
3. 3단락 (사건 배경 및 상세 팩트): 사건의발생 경위, 데이터, 핵심 관련자의 서술을 포함한 3문장 이상의 상세 리포트
4. 4단락 (심층 파장 및 향후 전망): 이 사건이 시사하는 경제/사회적 파장과 미래 영향에 대한 심층 전문가 분석
5. 5단락 (필수 해시태그): 기사 핵심 키워드를 포함한 4개 이상의 해시태그 나열 (예시: #기자단특종 #사건분석 #현장리포트 #전망)
6. 기사체 톤앤매너(~다, ~조사됐다, ~전망된다)를 엄격히 유지하세요.`

const DEFAULT_COMMENT_PROMPT = `당신은 커뮤니티 유저들과 활발하게 소통하는 라이브 반응 봇입니다.
타인의 게시글이나 댓글에 반응할 때 1~2문장의 짤막하고 임팩트 있는 커뮤니티 구어체 단문 댓글을 작성하세요.
인사말이나 AI 스러운 문장은 배제하고, 캐릭터 특유의 어조와 추임새를 자연스럽게 살리세요.`

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
    feed_prompt_reporter?: string | null
  }
  showTab?: 'robot' | 'feed' | 'comment'
}

const DEFAULT_FEED_PROMPT_LITE = `당신은 커뮤니티에서 활동하며 어그로를 끌고 사람들의 관심을 유도하는 인플루언서 봇입니다.
다음 페르소나 설정에 맞춰서, 구글에서 긁어온 실제 뉴스를 사람들에게 공유하며 '후킹(Hooking)'하는 4줄 글을 작성해주세요.

[작성 규칙 - 라이트 4줄 구조]
1. 1줄 (제목): 기사의 핵심 키워드를 중심으로 짧고 자극적인 어그로성 제목 (제목에 '#' 및 완결 어미 금지)
2. 2줄: 기사의 내용을 커뮤니티 말투로 뼈때리게 요약
3. 3줄: 사람들의 댓글을 유도하는 신랄한 한 줄 평이나 도발적인 질문
4. 4줄: 본문 핵심 키워드를 활용해 총 3~4개의 해시태그 나열 (#제목키워드 #본문키워드)`

export default function SystemPromptsForm({ settings, showTab = 'robot' }: Props) {
  const [isPending, startTransition] = useTransition()
  
  const [autoBotPrompt, setAutoBotPrompt] = useState(settings?.auto_bot_prompt || DEFAULT_AUTO_BOT_PROMPT)
  const [feedPromptPro, setFeedPromptPro] = useState(settings?.feed_prompt_pro || DEFAULT_FEED_PROMPT_PRO)
  const [feedPromptLite, setFeedPromptLite] = useState(settings?.feed_prompt_lite || DEFAULT_FEED_PROMPT_LITE)
  const [feedPromptReporter, setFeedPromptReporter] = useState(settings?.feed_prompt_reporter || DEFAULT_FEED_PROMPT_REPORTER)
  const [commentPrompt, setCommentPrompt] = useState(settings?.auto_bot_profile_prompt || DEFAULT_COMMENT_PROMPT)
  const [feedTab, setFeedTab] = useState<'lite' | 'pro' | 'reporter'>('lite')

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* 상단 폼 컨트롤 버튼 */}
      <div className="flex justify-between items-center border-b border-gray-200 pb-3">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          {showTab === 'feed' && <span>📰 피드 프롬프트 설정</span>}
          {showTab === 'comment' && <span>💬 댓글 프롬프트 설정</span>}
          {showTab === 'robot' && <span>🤖 오토봇 기획 설정</span>}
        </h2>
        
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 text-xs bg-black text-white rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 transition shadow-sm"
        >
          {isPending ? '저장 중...' : '설정 저장'}
        </button>
      </div>


      {/* 히든 파라미터 보존 */}
      <input type="hidden" name="autoBotPrompt" value={autoBotPrompt} />
      <input type="hidden" name="feedPromptPro" value={feedPromptPro} />
      <input type="hidden" name="feedPromptLite" value={feedPromptLite} />
      <input type="hidden" name="autoBotProfilePrompt" value={commentPrompt} />

      <div>
        {showTab === 'feed' && (
          <div className="space-y-3">
            {/* 서브 탭: 3대 독자 피드 (라이트 / 프로 / 기자단) */}
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setFeedTab('lite')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                  feedTab === 'lite'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                ⚡ 라이트 피드 (4줄 후킹 짧은글)
              </button>
              <button
                type="button"
                onClick={() => setFeedTab('pro')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                  feedTab === 'pro'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🧠 프로 피드 (3단락 논리 분석)
              </button>
              <button
                type="button"
                onClick={() => setFeedTab('reporter')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                  feedTab === 'reporter'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                📰 기자단 피드 (5단락 심층 보도)
              </button>
            </div>

            {feedTab === 'lite' && (
              <textarea
                name="feedPromptLite"
                value={feedPromptLite}
                onChange={e => setFeedPromptLite(e.target.value)}
                className="w-full min-h-[480px] border border-gray-300 rounded-2xl p-5 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed bg-gray-50 text-gray-900"
                placeholder="라이트 피드 지침(4줄 후킹 짧은글)을 작성하세요."
              />
            )}
            {feedTab === 'pro' && (
              <textarea
                name="feedPromptPro"
                value={feedPromptPro}
                onChange={e => setFeedPromptPro(e.target.value)}
                className="w-full min-h-[480px] border border-gray-300 rounded-2xl p-5 text-xs font-mono focus:ring-2 focus:ring-purple-500 outline-none leading-relaxed bg-gray-50 text-gray-900"
                placeholder="프로 피드 지침(3단락 전문 분석)을 작성하세요."
              />
            )}
            {feedTab === 'reporter' && (
              <textarea
                name="feedPromptReporter"
                value={feedPromptReporter}
                onChange={e => setFeedPromptReporter(e.target.value)}
                className="w-full min-h-[480px] border border-gray-300 rounded-2xl p-5 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed bg-gray-50 text-gray-900"
                placeholder="기자단 심층 보도 피드 지침(5단락 기사체)을 작성하세요."
              />
            )}

            {/* 비활성 탭 값은 hidden으로 보존하여 폼 제출 시 유실 방지 */}
            {feedTab !== 'lite' && <input type="hidden" name="feedPromptLite" value={feedPromptLite} />}
            {feedTab !== 'pro' && <input type="hidden" name="feedPromptPro" value={feedPromptPro} />}
            {feedTab !== 'reporter' && <input type="hidden" name="feedPromptReporter" value={feedPromptReporter} />}
          </div>
        )}

        {showTab === 'comment' && (
          <textarea
            name="autoBotProfilePrompt"
            value={commentPrompt}
            onChange={e => setCommentPrompt(e.target.value)}
            className="w-full min-h-[480px] border border-gray-300 rounded-2xl p-5 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed bg-gray-50 text-gray-900"
            placeholder="댓글 소통 반응 프롬프트를 작성하세요."
          />
        )}

        {showTab === 'robot' && (
          <textarea
            name="autoBotPrompt"
            value={autoBotPrompt}
            onChange={e => setAutoBotPrompt(e.target.value)}
            className="w-full min-h-[480px] border border-gray-300 rounded-2xl p-5 text-xs font-mono focus:ring-2 focus:ring-purple-500 outline-none leading-relaxed bg-gray-50 text-gray-900"
            placeholder="오토봇 무작위 기획 프롬프트를 작성하세요."
          />
        )}
      </div>

    </form>
  )
}



