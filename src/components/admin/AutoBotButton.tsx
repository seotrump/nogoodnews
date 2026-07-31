'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { createAiBot } from '@/app/[locale]/admin/actions'

export default function AutoBotButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingType, setLoadingType] = useState<'general' | 'pro' | null>(null)
  const router = useRouter()

  const handleGeneralBot = async () => {
    setIsLoading(true)
    setLoadingType('general')
    const toastId = toast.loading('[라이트] 1/2: 봇 기획 중...')
    try {
      // 1. 기획
      const res = await fetch('/api/ai-bot-auto-create', { method: 'POST' })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || '로봇 기획에 실패했습니다.');
      }
      const { displayName, coreIdentity, category } = await res.json()
      
      // 2. 튜닝
      toast.loading('[라이트] 2/2: 성격 튜닝 중...', { id: toastId })
      const tuneRes = await fetch('/api/ai-bot-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coreIdentity })
      })
      if (!tuneRes.ok) throw new Error('로봇 튜닝에 실패했습니다.')
      const data = await tuneRes.json()
      if (category) data.category = category

      await saveBotToDb(displayName, coreIdentity, data, toastId, '라이트')
    } catch (err: any) {
      toast.error(err.message, { id: toastId })
    } finally {
      setIsLoading(false)
      setLoadingType(null)
    }
  }

  const handleProBot = async () => {
    setIsLoading(true)
    setLoadingType('pro')
    const toastId = toast.loading('[PRO] 1/4: 세계관 딥 기획 중...')
    try {
      // Step 1: Concept
      let res = await fetch('/api/ai-bot-pro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 1 }) })
      if (!res.ok) throw new Error('1단계 세계관 기획 실패')
      const { displayName, coreIdentity, category } = await res.json()

      // Step 2: Script
      toast.loading('[PRO] 2/4: 가상 대본 시뮬레이션 중...', { id: toastId })
      res = await fetch('/api/ai-bot-pro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 2, coreIdentity }) })
      if (!res.ok) throw new Error('2단계 대본 작성 실패')
      const { script } = await res.json()

      // Step 3: Parameters
      toast.loading('[PRO] 3/4: 성격 수치 프로파일링 중...', { id: toastId })
      res = await fetch('/api/ai-bot-pro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 3, script }) })
      if (!res.ok) throw new Error('3단계 성격 파라미터 추출 실패')
      const params = await res.json()
      if (category) params.category = category

      // Step 4: Avatar Prompt
      toast.loading('[PRO] 4/4: 아바타/최종 컴파일 중...', { id: toastId })
      res = await fetch('/api/ai-bot-pro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 4, coreIdentity }) })
      if (!res.ok) throw new Error('4단계 아바타 기획 실패')
      const { avatarPrompt } = await res.json()

      // Compile Pro Prompt
      const fullCoreIdentity = `${coreIdentity}\n\n[Sample Script]\n${script}\n\n[Avatar Prompt]\n${avatarPrompt}`

      await saveBotToDb(displayName, fullCoreIdentity, params, toastId, 'PRO')
    } catch (err: any) {
      toast.error(err.message, { id: toastId })
    } finally {
      setIsLoading(false)
      setLoadingType(null)
    }
  }

  const saveBotToDb = async (displayName: string, coreIdentity: string, data: any, toastId: string, typeName: string) => {
    // Prompt 컴파일
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

    // DB 등록
    toast.loading(`마무리 작업 중...`, { id: toastId })
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
    formData.append('aiModelProvider', typeName === '라이트' ? 'gemini-3.1-flash-lite' : 'gemini-3.5-flash-lite')
    formData.append('category', data.category || 'politics')
    formData.append('botTier', '1')
    formData.append('status', 'active')
    formData.append('personaPrompt', prompt)
    formData.append('advancedSettings', JSON.stringify(advancedSettings))
    formData.append('postPriority', '1')
    formData.append('commentPriority', '1')
    formData.append('interval', '60')

    await createAiBot(formData)
    
    toast.success(`[${typeName}] 로봇 [${displayName}] 생성 완료!`, { id: toastId })
    router.push('?tab=list')
    router.refresh()
  }

  return (
    <div className="ml-auto flex items-center gap-2">
      <button 
        type="button" 
        onClick={handleGeneralBot} 
        disabled={isLoading}
        className={`px-4 h-8 text-sm font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 ${
          isLoading && loadingType !== 'general' 
            ? 'bg-gray-100 text-gray-400' 
            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50'
        }`}
      >
        <span className="text-base">🤖</span>
        {isLoading && loadingType === 'general' ? '생성 중...' : '오토봇 라이트'}
      </button>

      <button 
        type="button" 
        onClick={handleProBot} 
        disabled={isLoading}
        className={`px-4 h-8 text-sm font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 ${
          isLoading && loadingType !== 'pro'
            ? 'bg-purple-100 text-purple-300'
            : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50'
        }`}
      >
        <span className="text-base">✨</span>
        {isLoading && loadingType === 'pro' ? 'PRO 생성 중...' : '오토봇 프로'}
      </button>
    </div>
  )
}
