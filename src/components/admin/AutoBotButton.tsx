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

  // 1. 오토봇 라이트 생성 (댓글 전용 — 단 1회 지능형 API 호출)
  const handleGeneralBot = async () => {
    setIsLoading(true)
    setLoadingType('general')
    const toastId = toast.loading('🤖 [오토봇 라이트] 댓글 전용 봇 생성 중...')
    try {
      const res = await fetch('/api/ai-bot-auto-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'lite', topic_keyword: topicKeyword || undefined })
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || '로봇 생성에 실패했습니다.')
      }
      const data = await res.json()
      const displayName = data.displayName || `라이트봇_${Date.now().toString().slice(-4)}`
      const coreIdentity = data.coreIdentity || '댓글 소통 전문 봇'

      // 역할: comment (댓글 전용) 고정
      data.role = 'comment'
      await saveBotToDb(displayName, coreIdentity, data, toastId, '라이트')
    } catch (err: any) {
      toast.error(err.message, { id: toastId })
    } finally {
      setIsLoading(false)
      setLoadingType(null)
    }
  }

  // 2. 오토봇 프로 생성 (피드/심층 보도용 — 단 1회 고도화 통합 API 호출)
  const handleProBot = async () => {
    setIsLoading(true)
    setLoadingType('pro')
    const toastId = toast.loading('✨ [오토봇 프로] 정밀 페르소나 기획 중...')
    try {
      const res = await fetch('/api/ai-bot-auto-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'pro', topic_keyword: topicKeyword || undefined })
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || '프로 로봇 생성에 실패했습니다.')
      }
      const data = await res.json()
      const displayName = data.displayName || `프로봇_${Date.now().toString().slice(-4)}`
      const coreIdentity = data.coreIdentity || '깊이 있는 분석 피드 전문 봇'

      // 역할: mixed (피드 작성 가능)
      data.role = data.role || 'mixed'
      await saveBotToDb(displayName, coreIdentity, data, toastId, 'PRO')
    } catch (err: any) {
      toast.error(err.message, { id: toastId })
    } finally {
      setIsLoading(false)
      setLoadingType(null)
    }
  }

  const saveBotToDb = async (displayName: string, coreIdentity: string, data: any, toastId: string, typeName: string) => {
    const isLight = typeName === '라이트'
    const finalRole = isLight ? 'comment' : (data.role || 'mixed')


    const advancedSettings = {
      coreIdentity,
      role: finalRole,
      axisTone: data.axisTone || 5,
      axisTarget: data.axisTarget || 5,
      axisVocab: data.axisVocab || 5,
      axisAttitude: data.axisAttitude || 5,
      axisAffection: data.axisAffection || 5,
      formality: data.formality || 'informal',
      catchphrases: [],
      forbiddenWords: [],
      triggerKeywords: [],
      fewShots: []
    }


    const formData = new FormData()
    formData.append('displayName', displayName)
    formData.append('username', '')
    formData.append('aiModelProvider', isLight ? 'gemini-3.1-flash-lite' : 'gemini-3.5-flash-lite')
    formData.append('category', data.category || 'politics')
    formData.append('botTier', '1')
    formData.append('status', 'active')
    formData.append('personaPrompt', coreIdentity)
    formData.append('advancedSettings', JSON.stringify(advancedSettings))

    formData.append('postPriority', '1')
    formData.append('commentPriority', '1')
    formData.append('interval', '60')
    if (data.existence_category) formData.append('existenceCategory', data.existence_category)
    if (data.existence_detail) formData.append('existenceDetail', data.existence_detail)
    if (data.realm_category) formData.append('realmCategory', data.realm_category)
    if (data.realm_detail) formData.append('realmDetail', data.realm_detail)
    if (data.speech_style) formData.append('speechStyle', data.speech_style)
    formData.append('botRole', finalRole)
    if (data.topic_keyword) formData.append('topicKeyword', data.topic_keyword)
    formData.append('botGender', data.gender || 'unknown')

    await createAiBot(formData)

    toast.success(`[${typeName}] 로봇 [${displayName}] 생성 완료!`, { id: toastId })
    router.push('./robot?tab=list')
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
          {isLoading && loadingType === 'general' ? '라이트 생성 중...' : '오토봇 라이트'}
        </button>

        <button 
          type="button" 
          onClick={handleProBot} 
          disabled={isLoading}
          className={`h-9 px-3.5 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 ${
            isLoading && loadingType === 'pro'
              ? 'bg-purple-700 text-white animate-pulse'
              : isLoading
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
              : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700'
          }`}
        >
          <span className="text-sm">✨</span>
          {isLoading && loadingType === 'pro' ? '프로 기획 중...' : '오토봇 프로'}
        </button>
      </div>
    </div>
  )
}
