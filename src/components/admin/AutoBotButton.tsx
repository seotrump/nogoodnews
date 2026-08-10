'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { createAiBot } from '@/app/[locale]/admin/actions'

export default function AutoBotButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingType, setLoadingType] = useState<'general' | 'pro' | null>(null)
  const [topicKeyword, setTopicKeyword] = useState('')
  const router = useRouter()

  const handleGeneralBot = async () => {
    setIsLoading(true)
    setLoadingType('general')
    const toastId = toast.loading('[라이트] 1/2: 봇 기획 중...')
    try {
      // 1. 기획 — res.json() 전체 보존 (existence_category 등 구조화 필드 포함)
      const res = await fetch('/api/ai-bot-auto-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_keyword: topicKeyword || undefined })
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || '로봇 기획에 실패했습니다.')
      }
      const conceptData = await res.json()
      const { displayName, coreIdentity, category } = conceptData
      
      // 2. 튜닝
      toast.loading('[라이트] 2/2: 성격 튜닝 중...', { id: toastId })
      const tuneRes = await fetch('/api/ai-bot-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coreIdentity })
      })
      if (!tuneRes.ok) throw new Error('로봇 튜닝에 실패했습니다.')
      const tuneData = await tuneRes.json()
      // 기획 단계의 구조화 필드를 튜닝 데이터에 병합 (기획 데이터 우선)
      const data = { ...tuneData, ...conceptData }

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
      // Step 1: Concept — 전체 보존 (구조화 필드 포함)
      let res = await fetch('/api/ai-bot-pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 1, topic_keyword: topicKeyword || undefined })
      })
      if (!res.ok) throw new Error('1단계 세계관 기획 실패')
      const conceptData = await res.json()
      const { displayName, coreIdentity, category } = conceptData

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
      // 기획 단계의 구조화 필드를 파라미터에 병합
      const mergedParams = { ...params, ...conceptData }

      // Step 4: Avatar Prompt
      toast.loading('[PRO] 4/4: 아바타/최종 컴파일 중...', { id: toastId })
      res = await fetch('/api/ai-bot-pro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 4, coreIdentity }) })
      if (!res.ok) throw new Error('4단계 아바타 기획 실패')
      const { avatarPrompt } = await res.json()

      // Compile Pro Prompt
      const fullCoreIdentity = `${coreIdentity}\n\n[Sample Script]\n${script}\n\n[Avatar Prompt]\n${avatarPrompt}`

      await saveBotToDb(displayName, fullCoreIdentity, mergedParams, toastId, 'PRO')
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
    // 성별 및 존재유형 명시 (수정 시 반영 기준점)
    const genderLabel: Record<string, string> = { male: '남성', female: '여성', non_binary: '논바이너리', unknown: '미지정' }
    const existenceLabel: Record<string, string> = {
      human: '인간', creature: '동식물/생물', mechanical: '기계/AI',
      spiritual: '귀신/영혼', extraterrestrial: '외계/타차원', conceptual: '개념/감정 의인화', hybrid: '혼합형', other: '기타'
    }
    if (data.gender && data.gender !== 'unknown') prompt += `# Character Info\n- Gender: ${genderLabel[data.gender] || data.gender}\n`
    if (data.existence_category) prompt += `- Existence Type: ${existenceLabel[data.existence_category] || data.existence_category}\n`
    if (data.existence_detail) prompt += `- Identity Detail: ${data.existence_detail}\n`
    if (data.speech_style) prompt += `- Speech Style: ${data.speech_style}\n`
    prompt += `\n`
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
    // 구조화 봇 필드 (v5.04) — AI가 반환한 값 저장
    if (data.existence_category) formData.append('existenceCategory', data.existence_category)
    if (data.existence_detail) formData.append('existenceDetail', data.existence_detail)
    if (data.realm_category) formData.append('realm_category', data.realm_category)
    if (data.realm_detail) formData.append('realm_detail', data.realm_detail)
    if (data.speech_style) formData.append('speechStyle', data.speech_style)
    formData.append('botRole', typeName === '라이트' ? 'comment' : (data.role || 'mixed'))

    if (data.topic_keyword) formData.append('topicKeyword', data.topic_keyword)
    formData.append('botGender', data.gender || 'unknown')

    await createAiBot(formData)
    
    toast.success(`[${typeName}] 로봇 [${displayName}] 생성 완료!`, { id: toastId })
    router.push('?tab=list')
    router.refresh()
  }

  return (
    <div className="ml-auto flex items-center gap-3">
      {/* 주제어 입력 (선택) */}
      <input
        type="text"
        value={topicKeyword}
        onChange={e => setTopicKeyword(e.target.value)}
        placeholder="주제어 입력 (선택) — 입력 시 주제 기반 생성"
        className="w-64 h-9 px-3 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white text-gray-900"
        disabled={isLoading}
      />

      {/* 오토봇 생성 버튼들 */}
      <div className="flex items-center gap-2">
        <button 
          type="button" 
          onClick={handleGeneralBot} 
          disabled={isLoading}
          className={`h-9 px-3.5 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 ${
            isLoading && loadingType === 'general'
              ? 'bg-purple-100 text-purple-700 border border-purple-300 animate-pulse'
              : isLoading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span className="text-sm">🤖</span>
          {isLoading && loadingType === 'general' ? '생성 중...' : '오토봇 라이트'}
        </button>

        <button 
          type="button" 
          onClick={handleProBot} 
          disabled={isLoading}
          className={`h-9 px-3.5 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 ${
            isLoading && loadingType !== 'pro'
              ? 'bg-purple-100 text-purple-300'
              : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50'
          }`}
        >
          <span className="text-sm">✨</span>
          {isLoading && loadingType === 'pro' ? 'PRO 생성 중...' : '오토봇 프로'}
        </button>
      </div>
    </div>
  )
}


