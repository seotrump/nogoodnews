'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { createAiBot } from '@/app/[locale]/admin/actions'

export default function AutoBotButton() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleAutoBot = async () => {
    setIsLoading(true)
    const toastId = toast.loading('1/3: 봇 컨셉 기획 중...')
    try {
      // 1. 기획
      const res = await fetch('/api/ai-bot-auto-create', { method: 'POST' })
      if (!res.ok) throw new Error('로봇 기획에 실패했습니다.')
      const { displayName, coreIdentity } = await res.json()
      
      // 2. 튜닝
      toast.loading('2/3: 성격 튜닝 중...', { id: toastId })
      const tuneRes = await fetch('/api/ai-bot-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coreIdentity })
      })
      if (!tuneRes.ok) throw new Error('로봇 튜닝에 실패했습니다.')
      const data = await tuneRes.json()

      // 3. Prompt 컴파일
      let prompt = `# Core Identity\n${coreIdentity}\n\n`
      prompt += `# Personality Axes (Scale 1-10)\n`
      prompt += `- Tone (1: 차갑고 건조함, 10: 뜨겁고 격정적): ${data.axisTone || 5}\n`
      prompt += `- Target (1: 상황/시스템, 10: 작성자 본인): ${data.axisTarget || 5}\n`
      prompt += `- Vocabulary (1: 정제된 팩트폭력, 10: 날것의 은어/밈): ${data.axisVocab || 5}\n`
      prompt += `- Attitude (1: 대놓고 시니컬, 10: 웃으면서 뼈때림): ${data.axisAttitude || 5}\n`
      prompt += `- Affection (1: 순수 비난, 10: 거친 위로 츤데레): ${data.axisAffection || 5}\n\n`
      prompt += `# Rules\n`
      const formalityText = data.formality === 'informal' ? '반말/음슴체 위주의 거친 커뮤니티 스타일' : data.formality === 'formal' ? '정중하고 깍듯한 존댓말 스타일' : '비꼬는 듯한 존댓말/반말 혼용'
      prompt += `- Formality: ${formalityText}\n`
      if (data.catchphrases?.length > 0) prompt += `- Catchphrases: ${data.catchphrases.join(', ')}\n`
      if (data.forbiddenWords?.length > 0) prompt += `- Forbidden Words: ${data.forbiddenWords.join(', ')}\n`

      // 4. DB 등록
      toast.loading('3/3: 로봇 생성 중...', { id: toastId })
      const advancedSettings = {
        coreIdentity,
        axisTone: data.axisTone || 5,
        axisTarget: data.axisTarget || 5,
        axisVocab: data.axisVocab || 5,
        axisAttitude: data.axisAttitude || 5,
        axisAffection: data.axisAffection || 5,
        formality: data.formality || 'informal',
        catchphrases: data.catchphrases || [],
        forbiddenWords: data.forbiddenWords || [],
        triggerKeywords: data.triggerKeywords || [],
        fewShots: []
      }

      const formData = new FormData()
      formData.append('displayName', displayName)
      formData.append('username', '') // 서버에서 자동 생성
      formData.append('aiModelProvider', 'gemma-4-31b') // 오토튜닝시 모델 강제할당
      formData.append('category', data.category || 'politics')
      formData.append('botTier', '1')
      formData.append('status', 'active')
      formData.append('personaPrompt', prompt)
      formData.append('advancedSettings', JSON.stringify(advancedSettings))
      formData.append('postPriority', '1')
      formData.append('commentPriority', '1')
      formData.append('interval', '60')

      await createAiBot(formData)
      
      toast.success(`로봇 [${displayName}] 생성 완료!`, { id: toastId })
      router.push('?tab=list')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message, { id: toastId })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button 
      type="button" 
      onClick={handleAutoBot} 
      disabled={isLoading}
      className="ml-auto px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold rounded-lg shadow-sm hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2"
    >
      <span className="text-base">🤖</span>
      {isLoading ? '생성 중...' : '오토 로봇'}
    </button>
  )
}
