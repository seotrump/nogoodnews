'use client'

import { useState, useTransition } from 'react'
import { toast } from 'react-hot-toast'
import { updateSystemPrompts } from '@/app/[locale]/admin/actions'

const DEFAULT_AUTO_BOT_PROMPT = `당신은 독창적인 커뮤니티 유저(봇) 컨셉 기획자입니다.
인터넷 커뮤니티(디시인사이드, 레딧, 블라인드 등)에서 흔히 볼 수 있거나 혹은 매우 독특하고 재미있는 가상의 유저 페르소나 하나를 무작위로 기획해주세요.

{EXISTING_LIST}`

const DEFAULT_AUTO_BOT_PROFILE_PROMPT = `당신은 AI 봇의 성격을 세밀하게 튜닝하는 프로파일러입니다.
아래의 핵심 정체성을 바탕으로, 봇이 커뮤니티에서 활동할 때 필요한 구체적인 성격 수치와 설정값들을 지정해주세요.
수치는 1~10 사이의 정수여야 합니다.

[핵심 정체성]
"{CORE_IDENTITY}"`

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="font-bold text-gray-800 mb-2">1. 봇 기획 프롬프트 (Core Identity)</h3>
        <p className="text-xs text-gray-500 mb-3">
          오토 로봇 생성 시 최초로 로봇의 '닉네임'과 '핵심 정체성'을 기획하는 프롬프트입니다.<br/>
          <span className="font-mono bg-white px-1 rounded border text-blue-600">{`{EXISTING_LIST}`}</span> 부분은 중복 방지를 위해 현재 존재하는 로봇 목록으로 자동 치환됩니다. 반드시 남겨두세요.
        </p>
        <textarea
          name="autoBotPrompt"
          value={prompt1}
          onChange={e => setPrompt1(e.target.value)}
          rows={12}
          className="w-full border-gray-300 rounded-md shadow-sm text-sm p-3 font-mono focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>

      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="font-bold text-gray-800 mb-2">2. 봇 성격 튜닝 프롬프트 (Profile)</h3>
        <p className="text-xs text-gray-500 mb-3">
          1단계에서 기획된 핵심 정체성을 바탕으로 구체적인 성격 수치, 말투, 금지어 등을 설정하는 프롬프트입니다.<br/>
          <span className="font-mono bg-white px-1 rounded border text-blue-600">{`{CORE_IDENTITY}`}</span> 부분은 1단계에서 생성된 정체성 내용으로 자동 치환됩니다. 반드시 남겨두세요.
        </p>
        <textarea
          name="autoBotProfilePrompt"
          value={prompt2}
          onChange={e => setPrompt2(e.target.value)}
          rows={18}
          className="w-full border-gray-300 rounded-md shadow-sm text-sm p-3 font-mono focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>

      <div className="flex justify-between items-center pt-2">
        <button
          type="button"
          onClick={handleReset}
          className="text-sm text-gray-500 hover:text-red-600 underline"
        >
          기본값으로 복원
        </button>
        
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2 bg-blue-600 text-white rounded-md font-bold hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {isPending ? '저장 중...' : '프롬프트 저장'}
        </button>
      </div>
    </form>
  )
}
