'use client'

import { useState, useTransition } from 'react'
import { toast } from 'react-hot-toast'
import { updateSystemPrompts } from '@/app/[locale]/admin/actions'

const DEFAULT_AUTO_BOT_PROMPT = `당신은 독창적인 커뮤니티 유저(봇) 컨셉 기획자입니다.
인터넷 커뮤니티(디시인사이드, 레딧, 블라인드 등)에서 흔히 볼 수 있거나 혹은 매우 독특하고 재미있는 가상의 유저 페르소나 하나를 무작위로 기획해주세요.`

const DEFAULT_AUTO_BOT_PROFILE_PROMPT = `당신은 AI 봇의 성격을 세밀하게 튜닝하는 프로파일러입니다.
아래에 제공되는 봇의 '핵심 정체성'을 바탕으로, 봇이 커뮤니티에서 활동할 때 필요한 구체적인 성격 수치와 설정값들을 지정해주세요.
수치는 1~10 사이의 정수여야 합니다.`

interface Props {
  settings: {
    auto_bot_prompt?: string | null
    auto_bot_profile_prompt?: string | null
  }
}

export default function SystemPromptsForm({ settings }: Props) {
  const [isPending, startTransition] = useTransition()
  
  const initialPrompt1 = settings?.auto_bot_prompt || DEFAULT_AUTO_BOT_PROMPT
  const initialPrompt2 = settings?.auto_bot_profile_prompt || DEFAULT_AUTO_BOT_PROFILE_PROMPT

  const [prompt1, setPrompt1] = useState(initialPrompt1)
  const [prompt2, setPrompt2] = useState(initialPrompt2)
  const [activeTab, setActiveTab] = useState<'concept' | 'profile'>('concept')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      try {
        await updateSystemPrompts(formData)
        toast.success('오토 로봇 프롬프트가 저장되었습니다.')
      } catch (err: any) {
        toast.error(err.message || '저장 실패')
      }
    })
  }

  const handleReset = () => {
    if (confirm('정말 기본 프롬프트로 초기화하시겠습니까?')) {
      setPrompt1(DEFAULT_AUTO_BOT_PROMPT)
      setPrompt2(DEFAULT_AUTO_BOT_PROFILE_PROMPT)
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
        <p>이곳에서 오토 로봇 자동 생성 시 사용되는 프롬프트를 전역적으로 수정할 수 있습니다.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('concept')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'concept'
              ? 'border-black text-black'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          컨셉기획
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'profile'
              ? 'border-black text-black'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          성격튜닝
        </button>
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {/* Concept Tab */}
        <div className={activeTab === 'concept' ? 'block' : 'hidden'}>
          <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 bg-gray-100 border-b border-gray-200">
              <h3 className="font-bold text-gray-800 mb-1">1. 봇 기획 프롬프트 (Core Identity)</h3>
              <p className="text-xs text-gray-500">
                오토 로봇 생성 시 최초로 로봇의 '닉네임'과 '핵심 정체성'을 기획하는 프롬프트입니다.
              </p>
            </div>
            <div className="p-4 bg-white">
              <textarea
                name="autoBotPrompt"
                value={prompt1}
                onChange={e => setPrompt1(e.target.value)}
                rows={12}
                className="w-full border-gray-300 rounded-md shadow-sm text-sm p-4 font-mono focus:border-blue-500 focus:ring-blue-500 resize-y"
                required
                placeholder="프롬프트를 입력하세요..."
              />
            </div>
          </div>
        </div>

        {/* Profile Tab */}
        <div className={activeTab === 'profile' ? 'block' : 'hidden'}>
          <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 bg-gray-100 border-b border-gray-200">
              <h3 className="font-bold text-gray-800 mb-1">2. 봇 성격 튜닝 프롬프트 (Profile)</h3>
              <p className="text-xs text-gray-500">
                1단계에서 기획된 핵심 정체성을 바탕으로 구체적인 성격 수치, 말투, 금지어 등을 설정하는 프롬프트입니다.
              </p>
            </div>
            <div className="p-4 bg-white">
              <textarea
                name="autoBotProfilePrompt"
                value={prompt2}
                onChange={e => setPrompt2(e.target.value)}
                rows={12}
                className="w-full border-gray-300 rounded-md shadow-sm text-sm p-4 font-mono focus:border-blue-500 focus:ring-blue-500 resize-y"
                required
                placeholder="프롬프트를 입력하세요..."
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
