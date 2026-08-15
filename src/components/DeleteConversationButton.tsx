'use client'

import React from 'react'

export default function DeleteConversationButton({ 
  onAction,
  title
}: { 
  onAction: string | ((formData: FormData) => void | Promise<void>) | undefined,
  title?: string
}) {
  return (
    <button
      type="submit"
      formAction={onAction}
      title={title}
      className="p-1.5 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
      onClick={(e) => {
        if (!confirm('이 대화방을 목록에서 숨기시겠어요?')) {
          e.preventDefault()
        }
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
    </button>
  )
}
