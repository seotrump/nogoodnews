'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'

export default function AiImageInjectButton({ targetId }: { targetId: string }) {
  const [isInjecting, setIsInjecting] = useState(false)

  const handleInject = async (e: React.MouseEvent) => {
    e.preventDefault() // prevent form submission
    const textarea = document.getElementById(targetId) as HTMLTextAreaElement
    if (!textarea) return

    const content = textarea.value
    if (!content.trim()) return toast.error('본문이 비어있습니다.')

    setIsInjecting(true)
    const toastId = toast.loading('✨ AI가 문맥을 분석하여 픽사베이 이미지를 자동 배치 중입니다...')

    try {
      const res = await fetch('/api/ai-image-inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'API 오류 발생')

      textarea.value = data.content
      // 강제 이벤트 트리거하여 폼 상태 변경 인식
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
      
      toast.success('이미지 자동 배치가 완료되었습니다!', { id: toastId })
    } catch (err: any) {
      toast.error('오류: ' + err.message, { id: toastId })
    } finally {
      setIsInjecting(false)
    }
  }

  return (
    <button
      onClick={handleInject}
      disabled={isInjecting}
      className="text-xs bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-3 py-1.5 rounded-md font-bold hover:from-emerald-600 hover:to-teal-600 transition disabled:opacity-50 shadow-sm flex items-center gap-1 ml-4"
    >
      {isInjecting ? '분석 및 삽입 중...' : '✨ AI 스마트 이미지 배치 (2~10장)'}
    </button>
  )
}
