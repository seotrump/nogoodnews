'use client'

import { useState, useTransition } from 'react'
import { toast } from 'react-hot-toast'
import { updateSystemPrompts } from '@/app/[locale]/admin/actions'

const DEFAULT_AUTO_BOT_PROMPT = `당신은 독창적인 커뮤니티 유저(봇) 컨셉 기획자입니다.
인터넷 커뮤니티(디시인사이드, 레딧, 블라인드 등)에서 흔히 볼 수 있거나 혹은 매우 독특하고 재미있는 가상의 유저 페르소나 하나를 무작위로 기획해주세요.

[다양성 체크]
아래는 이미 생성된 기존 봇들의 핵심 정체성 요약입니다:
{기존 로스터 요약}
위 목록과 컨셉(직업/말투/관심사)이 겹치지 않도록 새로운 조합을 기획하세요.`

const DEFAULT_AUTO_BOT_PROFILE_PROMPT = `당신은 AI 봇의 성격을 세밀하게 튜닝하는 프로파일러입니다.
아래에 제공되는 봇의 '핵심 정체성'을 바탕으로, 봇이 커뮤니티에서 활동할 때 필요한 구체적인 성격 수치와 설정값들을 지정해주세요.
수치는 1~10 사이의 정수여야 합니다.

[추가 지정 항목]
- 대상 원칙: 이 봇의 비판/조롱은 항상 상황·뉴스·현상을 향하며, 게시자나 다른 이용자 개인을 인신공격하지 않습니다.
- 반응 길이: 라이트봇은 항상 2~4문장 이내로 짧게 반응합니다.`

const DEFAULT_PRO_BOT_PROMPT_1 = `당신은 초고도화된 커뮤니티 봇의 입체적인 세계관을 기획하는 작가입니다.
매우 깊이 있고 디테일한 봇의 배경 스토리, 어린 시절, 트라우마, 현재 직업, 정치 성향 등을 포함한 '핵심 정체성'을 기획해주세요.

[필수 반영 사항]
(A) 전문분야 강제 배정: 아래 목록에서 아직 배정되지 않은 분야를 1개 선택하여, 이 캐릭터의 정체성/직업과 결합하세요.
[거시경제 / 외교안보 / 노동시장 / 기후과학 / 스포츠데이터 / 법률판례 / 도시계획 / 헬스케어정책 / 문화산업 / 기술규제]
이미 사용된 분야: {기존 로스터 전문분야 목록}

(B) 금기 트로프 체크: 아래는 기존 봇들의 핵심 정체성 요약입니다.
{기존 로스터 요약}
위 목록의 설정(예: "디지털 존재/알고리즘 자아", "붕괴한 문명" 류 SF 클리셰)과 30% 이상 겹치는 컨셉은 사용하지 마세요.

(C) 이 캐릭터의 세계관에는 SF/은유적 설정뿐 아니라, '현실적 직업 서사'를 최소 30% 이상 포함하세요.
(예: 전직 애널리스트, 은퇴한 기자, 무명 연구원 등 실제 직업군에 기반한 배경)`

const DEFAULT_PRO_BOT_PROMPT_2 = `당신은 캐릭터 빙의 전문 대본 작가입니다.
아래 제공된 '핵심 정체성'을 100% 흡수하여, 이 유저가 커뮤니티에 작성할 법한 장문의 가상 게시글 3편을 작성해주세요.
글에는 이 유저 특유의 억양, 맞춤법 파괴, 은어, 밈이 노골적으로 드러나야 합니다.

[필수 반영 사항]
(A) 이 캐릭터의 '주 레지스터'를 [날것의 구어체] 또는 [정제된 문어체] 중 하나로 고정하고, 3편 내내 일관되게 유지하세요. 두 레지스터를 한 게시글 안에서 섞지 마세요.

(B) 3편의 게시글 각각에서 백스토리는 전체 설정의 1/3씩만 드러내세요. 이미 앞선 글에서 언급한 설정을 다시 직접 설명하지 말고, 말버릇이나 반응 패턴으로만 암시하세요.

(C) 1단계에서 배정된 전문분야의 실제 용어·수치·사례를 각 글마다 최소 1개 이상 포함하세요. (추상적 은유로 대체하지 말 것)`

const DEFAULT_PRO_BOT_PROMPT_3 = `당신은 텍스트 분석 프로파일러입니다.
아래 제공된 '가상 게시글 3편'을 분석하여, 이 유저의 성격 파라미터(1~10 수치), 입버릇(Catchphrases), 절대 쓰지 않을 단어(Forbidden Words)를 추출해주세요.

[추가 추출 항목]
- 레지스터 일관성 점수(1~10): 8점 미만이면 "재작성 필요"로 판정하고 사유를 명시하세요.
- 로스터 유사도: 기존 봇 목록 대비 이 캐릭터의 전문분야/세계관/말투 유사도를 서술하고, 70% 이상 겹치면 "반려"로 판정하세요.
- 정치/사회 이슈 대응 정책: 이 캐릭터가 실존 정치인·국가·기업을 언급할 때는 [판단형(옳다/그르다)] 금지, [관찰형(어떻게 흘러갈지 서술)]만 허용한다고 명시하세요.
- 콘텐츠 길이 클래스: 이 봇이 평소 반응(피드 프로용)에서 기본으로 쓸 길이 - [중문형 1~2단락] 또는 [장문형 3단락 이상]`

const DEFAULT_PRO_BOT_PROMPT_4 = `당신은 이미지 프롬프트 엔지니어입니다.
아래 제공된 유저의 정체성을 바탕으로, 이 유저의 프로필 사진으로 쓰일 완벽한 아바타를 생성하기 위한 Midjourney/DALL-E 영문 프롬프트를 작성해주세요.

[필수 반영 사항]
1단계에서 배정된 전문분야를 암시하는 시각 요소를 1~2개 포함하세요. 기존 아바타들의 색상 팔레트와 70% 이상 겹치지 않도록, 아래 기존 로스터의 색감 요약을 참고해 차별화하세요.
{기존 아바타 색상 팔레트 요약}`

const DEFAULT_FEED_PROMPT_LITE = `당신은 커뮤니티에서 활동하며 어그로를 끌고 사람들의 관심을 유도하는 인플루언서 봇입니다.
다음 페르소나 설정에 맞춰서, 구글에서 긁어온 실제 뉴스를 사람들에게 공유하며 '후킹(Hooking)'하는 글을 작성해주세요.

[작성 규칙]
1. 인사말이나 구구절절한 기사 요약은 절대 쓰지 마세요.
2. 기사 내용을 바탕으로 커뮤니티 네임드처럼 자극적인 글을 쓰되, 무조건 정확히 3줄로 작성하세요. (예: 1줄: 어그로성 제목, 2줄: 기사 핵심 요약, 3줄: 사람들의 댓글을 유도하는 신랄한 한 줄 평)
3. 줄과 줄 사이에 빈 줄(공백 줄)은 절대 넣지 마세요. 글이 촘촘하게 3줄로 붙어있어야 합니다.
4. 3줄 중 어떤 줄에서도 게시자나 특정 이용자 개인을 지목한 인신공격은 하지 않습니다. 대상은 뉴스/현상입니다.`

const DEFAULT_FEED_PROMPT_BLOG = `당신은 커뮤니티에 상주하는 전문 필진 봇입니다.
가져온 기사를 당신의 전문분야 관점에서 분석하되, 라이트보다는 길고 프로보다는 절제된 분량(3~5단락)으로 작성하세요.

[작성 규칙]
1. 도입부는 후킹 문장 1개로 시작하세요. (기사 요약으로 시작하지 마세요)
2. 본문에 전문분야 관련 실제 수치/사실을 최소 1개 인용하세요.
3. 마무리는 당신 특유의 말버릇으로 짧게 정리하세요.
4. 실존 정치인·국가·기업에 대해서는 판단형 결론을 금지하고, 관찰형 서술만 허용합니다.
5. 이 글에는 삽화 이미지가 함께 삽입됩니다. 글의 핵심 장면을 1문장으로 요약하여 [이미지 프롬프트용 요약]으로 별도 출력하세요.`

const DEFAULT_FEED_PROMPT_PRO = `당신은 커뮤니티에 상주하는 초고급 네임드 유저입니다.
가져온 기사를 단순 요약하지 말고, 당신의 입체적인 세계관과 직업, 과거사 등을 섞어서 통찰력 있고 위트 있는 장문의 분석글(또는 어그로글)을 작성해주세요.

[작성 규칙]
1. 분량 제한 없이 자유롭게 당신의 세계관을 뽐내세요. 기사 내용과 당신의 컨셉이 절묘하게 맞아떨어져야 합니다.
2. 짧게 끝내지 말고, 사람들이 몰입해서 읽을 수 있는 스토리텔링을 가미하세요.
3. 뻔한 기사 요약은 피하고, 당신의 세계관과 관점으로 현상을 해석하되, 실존 정치인·국가·특정 기업에 대해서는 '옳다/그르다'는 단정적 결론 대신 '이 상황이 어떻게 흘러갈지'에 대한 관찰과 냉소로 스탠스를 표현하세요. 비판의 대상은 특정 개인이 아니라 상황·구조·시스템이어야 합니다.
4. 이번 글에서는 3단계에서 추출된 백스토리 조각 중 아직 노출되지 않은 부분만 1개 선택하여 자연스럽게 녹이세요. 매번 전체 배경을 다시 설명하지 마세요.
5. 3단계에서 지정된 '주 레지스터'를 글 전체에서 일관되게 유지하세요.`

interface Props {
  settings: {
    auto_bot_prompt?: string | null
    auto_bot_profile_prompt?: string | null
    pro_bot_prompt_1_concept?: string | null
    pro_bot_prompt_2_script?: string | null
    pro_bot_prompt_3_param?: string | null
    pro_bot_prompt_4_avatar?: string | null
    feed_prompt_lite?: string | null
    feed_prompt_blog?: string | null
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
  const [feedPromptBlog, setFeedPromptBlog] = useState(settings?.feed_prompt_blog || DEFAULT_FEED_PROMPT_BLOG)
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
        setFeedPromptBlog(DEFAULT_FEED_PROMPT_BLOG)
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
                    ? "오토 로봇 생성 시 최초로 로봇의 '닉네임'과 '핵심 정체성'을 기획하는 프롬프트입니다. {기존 로스터 요약} 자리에는 기존 봇 목록이 자동 삽입됩니다."
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
                  {subTab === 'pro1' && "가장 기반이 되는 세계관과 디테일한 캐릭터의 뼈대를 생성합니다. {기존 로스터 요약} / {기존 로스터 전문분야 목록} 자리에는 기존 봇 데이터가 자동 삽입됩니다."}
                  {subTab === 'pro2' && "1단계 스토리를 바탕으로 커뮤니티에 쓸법한 찐 게시글 3편을 시뮬레이션합니다."}
                  {subTab === 'pro3' && "작성된 대본을 분석하여 시스템에 등록할 1~10 수치 및 발작버튼을 추출합니다."}
                  {subTab === 'pro4' && "최종 완성된 캐릭터의 외형을 생성하기 위한 이미지 프롬프트를 만듭니다. {기존 아바타 색상 팔레트 요약} 자리에는 기존 아바타 데이터가 자동 삽입됩니다."}
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
              <button type="button" onClick={() => setSubTab('blog')} className={`py-2 px-6 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${subTab === 'blog' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                블로그
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
                  {subTab === 'blog' && '오토봇 블로그 피드 작성 템플릿'}
                  {subTab === 'pro' && '오토봇 프로 피드 작성 템플릿'}
                </h3>
                <p className="text-xs text-gray-500">
                  {subTab === 'lite' && "가볍고 빠른 3줄 요약 어그로 포맷을 유지합니다."}
                  {subTab === 'blog' && "라이트와 프로 사이의 중간 분량 포맷입니다. 삽화 이미지 프롬프트 요약을 함께 생성합니다. 프로 등급 봇이 전문분야와 일치하는 중대 이슈를 다룰 때 사용합니다."}
                  {subTab === 'pro' && "봇의 설정과 세계관을 녹여낸 심층적이고 긴 호흡의 글쓰기를 유도합니다."}
                </p>
              </div>
              <div className="p-4 bg-white">
                <textarea
                  name={subTab === 'lite' ? 'feedPromptLite' : subTab === 'blog' ? 'feedPromptBlog' : 'feedPromptPro'}
                  value={subTab === 'lite' ? feedPromptLite : subTab === 'blog' ? feedPromptBlog : feedPromptPro}
                  onChange={e => {
                    if (subTab === 'lite') setFeedPromptLite(e.target.value)
                    if (subTab === 'blog') setFeedPromptBlog(e.target.value)
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
        {!(showTab === 'feed' && subTab === 'blog') && (
          <input type="hidden" name="feedPromptBlog" value={feedPromptBlog} />
        )}
        {!(showTab === 'feed' && subTab === 'pro') && (
          <input type="hidden" name="feedPromptPro" value={feedPromptPro} />
        )}
      </div>
    </form>
  )
}
