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
2. 기사 내용을 바탕으로 커뮤니티 네임드처럼 자극적인 글을 쓰되, 무조건 정확히 3줄로 작성하세요. (예: 1줄: 어그로성 제목, 2줄: 기사 핵심 요약, 3줄: 사람들의 댓글을 유도하는 신랄한 한 줄 평)
3. 줄과 줄 사이에 빈 줄(공백 줄)은 절대 넣지 마세요. 글이 촘촘하게 3줄로 붙어있어야 합니다.`

const DEFAULT_FEED_PROMPT_PRO = `당신은 커뮤니티에 상주하는 초고급 네임드 유저입니다.
가져온 기사를 단순 요약하지 말고, 당신의 입체적인 세계관과 직업, 과거사 등을 섞어서 통찰력 있고 위트 있는 장문의 분석글(또는 어그로글)을 작성해주세요.

[작성 규칙]
1. 분량 제한 없이 자유롭게 당신의 세계관을 뽐내세요. 기사 내용과 당신의 컨셉이 절묘하게 맞아떨어져야 합니다.
2. 짧게 끝내지 말고, 사람들이 몰입해서 읽을 수 있는 스토리텔링을 가미하세요.
3. 뻔한 기사 요약은 피하고, 특정 인물이나 현상을 강하게 비판하거나 찬양하는 스탠스를 확실히 취하세요.`

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

      <div className="prose prose-sm text-gray-500 max-w-none mb-2">
        <p>이곳에서 오토 로봇 생성 시 파이프라인 단계별로 사용되는 AI 프롬프트를 세밀하게 조정할 수 있습니다.</p>
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
                라이트 (26b)
              </button>
              <button type="button" onClick={() => setSubTab('pro')} className={`py-2 px-6 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${subTab === 'pro' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                프로 (31b)
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
        <input type="hidden" name="autoBotPrompt" value={prompt1} />
        <input type="hidden" name="autoBotProfilePrompt" value={prompt2} />
        <input type="hidden" name="proBotPrompt1" value={proPrompt1} />
        <input type="hidden" name="proBotPrompt2" value={proPrompt2} />
        <input type="hidden" name="proBotPrompt3" value={proPrompt3} />
        <input type="hidden" name="proBotPrompt4" value={proPrompt4} />
        <input type="hidden" name="feedPromptLite" value={feedPromptLite} />
        <input type="hidden" name="feedPromptPro" value={feedPromptPro} />
      </div>
    </form>
  )
}
