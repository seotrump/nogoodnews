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
  showTab?: 'robot' | 'feed'
}

export default function SystemPromptsForm({ settings, showTab = 'robot' }: Props) {
  const [isPending, startTransition] = useTransition()
  
  // General
  const [prompt1, setPrompt1] = useState(settings?.auto_bot_prompt || DEFAULT_AUTO_BOT_PROMPT)
  const [prompt2, setPrompt2] = useState(settings?.auto_bot_profile_prompt || DEFAULT_AUTO_BOT_PROFILE_PROMPT)
  
  // Pro
  const [proPrompt1, setProPrompt1] = useState(settings?.pro_bot_prompt_1_concept || DEFAULT_PRO_BOT_PROMPT_1)
  const [proPrompt2, setProPrompt2] = useState(settings?.pro_bot_prompt_2_script || DEFAULT_PRO_BOT_PROMPT_2)
  const [proPrompt3, setProPrompt3] = useState(settings?.pro_bot_prompt_3_param || DEFAULT_PRO_BOT_PROMPT_3)
  const [proPrompt4, setProPrompt4] = useState(settings?.pro_bot_prompt_4_avatar || DEFAULT_PRO_BOT_PROMPT_4)

  // Feed
  const [feedPromptLite, setFeedPromptLite] = useState(settings?.feed_prompt_lite || DEFAULT_FEED_PROMPT_LITE)
  const [feedPromptPro, setFeedPromptPro] = useState(settings?.feed_prompt_pro || DEFAULT_FEED_PROMPT_PRO)

  const [topTab, setTopTab] = useState<'general' | 'pro' | 'feed'>(showTab === 'feed' ? 'feed' : 'general')
  const [subTab, setSubTab] = useState<string>(showTab === 'feed' ? 'lite' : 'concept')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      try {
        await updateSystemPrompts(formData)
        toast.success('로봇 프롬프트가 저장되었습니다.')
      } catch (err: any) {
        toast.error(err.message || '저장 실패')
      }
    })
  }

  const handleReset = () => {
    if (confirm('정말 기본 프롬프트로 초기화하시겠습니까?')) {
      if (topTab === 'general') {
        setPrompt1(DEFAULT_AUTO_BOT_PROMPT)
        setPrompt2(DEFAULT_AUTO_BOT_PROFILE_PROMPT)
      } else if (topTab === 'pro') {
        setProPrompt1(DEFAULT_PRO_BOT_PROMPT_1)
        setProPrompt2(DEFAULT_PRO_BOT_PROMPT_2)
        setProPrompt3(DEFAULT_PRO_BOT_PROMPT_3)
        setProPrompt4(DEFAULT_PRO_BOT_PROMPT_4)
      } else if (topTab === 'feed') {
        setFeedPromptLite(DEFAULT_FEED_PROMPT_LITE)
        setFeedPromptPro(DEFAULT_FEED_PROMPT_PRO)
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Header: Title and Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          오토 로봇 프롬프트 관리
        </h1>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md font-medium hover:bg-gray-200 transition"
          >
            기본값 복원
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2 text-sm bg-blue-600 text-white rounded-md font-bold hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
          >
            {isPending ? '저장 중...' : '프롬프트 저장'}
          </button>
        </div>
      </div>

      {/* Top Level Tabs - Only show if in 'robot' context. Feed context handles its own display. */}
      {showTab === 'robot' && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setTopTab('general'); setSubTab('concept'); }}
            className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all border ${
              topTab === 'general'
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            오토봇 라이트
          </button>
          <button
            type="button"
            onClick={() => { setTopTab('pro'); setSubTab('pro1'); }}
            className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all border ${
              topTab === 'pro'
                ? 'bg-purple-50 border-purple-200 text-purple-700 shadow-sm'
                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            오토봇 프로
          </button>
        </div>
      )}

      <div className="mt-2">
        {topTab === 'general' && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-300">
            {/* General Sub Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                type="button"
                onClick={() => setSubTab('concept')}
                className={`py-2 px-6 text-sm font-bold border-b-2 transition-colors ${
                  subTab === 'concept'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                1. 컨셉기획
              </button>
              <button
                type="button"
                onClick={() => setSubTab('profile')}
                className={`py-2 px-6 text-sm font-bold border-b-2 transition-colors ${
                  subTab === 'profile'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                2. 성격튜닝
              </button>
            </div>

            {/* General Content */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-100 border-b border-gray-200">
                <h3 className="font-bold text-gray-800 mb-1">
                  {subTab === 'concept' ? '봇 기획 프롬프트 (Core Identity)' : '봇 성격 튜닝 프롬프트 (Profile)'}
                </h3>
                <p className="text-xs text-gray-500">
                  {subTab === 'concept' 
                    ? "오토 로봇 생성 시 최초로 로봇의 '닉네임'과 '핵심 정체성'을 기획하는 프롬프트입니다."
                    : "1단계에서 기획된 핵심 정체성을 바탕으로 구체적인 성격 수치, 말투, 금지어 등을 설정하는 프롬프트입니다."}
                </p>
              </div>
              <div className="p-4 bg-white">
                <textarea
                  name={subTab === 'concept' ? 'autoBotPrompt' : 'autoBotProfilePrompt'}
                  value={subTab === 'concept' ? prompt1 : prompt2}
                  onChange={e => subTab === 'concept' ? setPrompt1(e.target.value) : setPrompt2(e.target.value)}
                  rows={10}
                  className="w-full border-gray-300 rounded-md shadow-sm text-sm p-4 font-mono focus:border-indigo-500 focus:ring-indigo-500 resize-y"
                  required
                  placeholder="프롬프트를 입력하세요..."
                />
              </div>
            </div>
          </div>
        )}

        {topTab === 'pro' && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-300">
            {/* Pro Sub Tabs */}
            <div className="flex border-b border-gray-200 overflow-x-auto">
              <button type="button" onClick={() => setSubTab('pro1')} className={`py-2 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${subTab === 'pro1' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                1. 정체성 기획
              </button>
              <button type="button" onClick={() => setSubTab('pro2')} className={`py-2 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${subTab === 'pro2' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                2. 대본 작성
              </button>
              <button type="button" onClick={() => setSubTab('pro3')} className={`py-2 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${subTab === 'pro3' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                3. 파라미터 추출
              </button>
              <button type="button" onClick={() => setSubTab('pro4')} className={`py-2 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${subTab === 'pro4' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                4. 아바타 프롬프트
              </button>
            </div>

            {/* Pro Content */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-100 border-b border-gray-200">
                <h3 className="font-bold text-gray-800 mb-1">
                  {subTab === 'pro1' && '1단계: 세계관 및 정체성 딥 기획'}
                  {subTab === 'pro2' && '2단계: 페르소나 대본 작성 (말투 훈련)'}
                  {subTab === 'pro3' && '3단계: 텍스트 프로파일링 (파라미터 추출)'}
                  {subTab === 'pro4' && '4단계: 아바타 이미지 프롬프트 도출'}
                </h3>
                <p className="text-xs text-gray-500">
                  {subTab === 'pro1' && "가장 기반이 되는 세계관과 디테일한 캐릭터의 뼈대를 생성합니다."}
                  {subTab === 'pro2' && "1단계 스토리를 바탕으로 커뮤니티에 쓸법한 찐 게시글 3편을 시뮬레이션합니다."}
                  {subTab === 'pro3' && "작성된 대본을 분석하여 시스템에 등록할 1~10 수치 및 발작버튼을 추출합니다."}
                  {subTab === 'pro4' && "최종 완성된 캐릭터의 외형을 생성하기 위한 이미지 프롬프트를 만듭니다."}
                </p>
              </div>
              <div className="p-4 bg-white">
                <textarea
                  name={
                    subTab === 'pro1' ? 'proBotPrompt1' :
                    subTab === 'pro2' ? 'proBotPrompt2' :
                    subTab === 'pro3' ? 'proBotPrompt3' : 'proBotPrompt4'
                  }
                  value={
                    subTab === 'pro1' ? proPrompt1 :
                    subTab === 'pro2' ? proPrompt2 :
                    subTab === 'pro3' ? proPrompt3 : proPrompt4
                  }
                  onChange={e => {
                    const v = e.target.value
                    if (subTab === 'pro1') setProPrompt1(v)
                    if (subTab === 'pro2') setProPrompt2(v)
                    if (subTab === 'pro3') setProPrompt3(v)
                    if (subTab === 'pro4') setProPrompt4(v)
                  }}
                  rows={10}
                  className="w-full border-gray-300 rounded-md shadow-sm text-sm p-4 font-mono focus:border-purple-500 focus:ring-purple-500 resize-y"
                  required
                  placeholder="프롬프트를 입력하세요..."
                />
              </div>
            </div>
          </div>
        )}

        {topTab === 'feed' && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-300">
            {/* Feed Sub Tabs */}
            <div className="flex border-b border-gray-200 overflow-x-auto">
              <button type="button" onClick={() => setSubTab('lite')} className={`py-2 px-6 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${subTab === 'lite' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                라이트
              </button>
              <button type="button" onClick={() => setSubTab('pro')} className={`py-2 px-6 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${subTab === 'pro' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                프로
              </button>
            </div>

            {/* Feed Content */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-100 border-b border-gray-200">
                <h3 className="font-bold text-gray-800 mb-1">
                  {subTab === 'lite' && '오토봇 라이트 피드 작성 템플릿'}
                  {subTab === 'pro' && '오토봇 프로 피드 작성 템플릿'}
                </h3>
                <p className="text-xs text-gray-500">
                  {subTab === 'lite' && "가볍고 빠른 3줄 요약 어그로 포맷을 유지합니다."}
                  {subTab === 'pro' && "봇의 설정과 세계관을 녹여낸 심층적이고 긴 호흡의 글쓰기를 유도합니다."}
                </p>
              </div>
              <div className="p-4 bg-white">
                <textarea
                  name={subTab === 'lite' ? 'feedPromptLite' : 'feedPromptPro'}
                  value={subTab === 'lite' ? feedPromptLite : feedPromptPro}
                  onChange={e => {
                    if (subTab === 'lite') setFeedPromptLite(e.target.value)
                    if (subTab === 'pro') setFeedPromptPro(e.target.value)
                  }}
                  rows={12}
                  className="w-full border-gray-300 rounded-md shadow-sm text-sm p-4 font-mono focus:border-blue-500 focus:ring-blue-500 resize-y"
                  required
                  placeholder="피드 작성 프롬프트를 입력하세요..."
                />
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Hidden inputs to ensure inactive tab data is still submitted */}
      <div className="hidden">
        {!(showTab === 'robot' && topTab === 'general' && subTab === 'concept') && (
          <input type="hidden" name="autoBotPrompt" value={prompt1} />
        )}
        {!(showTab === 'robot' && topTab === 'general' && subTab === 'profile') && (
          <input type="hidden" name="autoBotProfilePrompt" value={prompt2} />
        )}
        
        {!(showTab === 'robot' && topTab === 'pro' && subTab === 'pro1') && (
          <input type="hidden" name="proBotPrompt1" value={proPrompt1} />
        )}
        {!(showTab === 'robot' && topTab === 'pro' && subTab === 'pro2') && (
          <input type="hidden" name="proBotPrompt2" value={proPrompt2} />
        )}
        {!(showTab === 'robot' && topTab === 'pro' && subTab === 'pro3') && (
          <input type="hidden" name="proBotPrompt3" value={proPrompt3} />
        )}
        {!(showTab === 'robot' && topTab === 'pro' && subTab === 'pro4') && (
          <input type="hidden" name="proBotPrompt4" value={proPrompt4} />
        )}

        {!(showTab === 'feed' && subTab === 'lite') && (
          <input type="hidden" name="feedPromptLite" value={feedPromptLite} />
        )}
        {!(showTab === 'feed' && subTab === 'pro') && (
          <input type="hidden" name="feedPromptPro" value={feedPromptPro} />
        )}
      </div>
    </form>
  )
}
