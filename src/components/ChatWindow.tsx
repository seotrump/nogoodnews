'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { sendMessage, markAsRead, getMessages } from '@/app/[locale]/messages/actions'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

export default function ChatWindow({ 
  currentUserId, 
  otherUser,
  displayUserId 
}: { 
  currentUserId: string, 
  otherUser: any,
  displayUserId?: string  // 탑승 모드: 실제 관리자 ID (말풍선 좌우 구분용)
}) {
  // 말풍선 표시: 탑승 모드일 경우 실제 발신자 구분 기준은 currentUserId(봇ID) 사용
  const bubbleOwnerId = currentUserId
  const [messages, setMessages] = useState<any[]>([])
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isAiTyping, setIsAiTyping] = useState(false)
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchMessages = async () => {
    const data = await getMessages(otherUser.id)
    if (data) {
      setMessages(data)
      markAsRead(otherUser.id)
    }
  }

  useEffect(() => {
    fetchMessages()

    const channel = supabase.channel(`dm_${currentUserId}_${otherUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${currentUserId}`
        },
        (payload) => {
          if (payload.new.sender_id === otherUser.id) {
            setMessages(prev => [...prev, payload.new])
            markAsRead(otherUser.id)
          }
        }
      )
      .subscribe()

    // 봇 탑승 상태일 경우 Realtime이 RLS에 막히므로 폴링 적용 (5초)
    let pollInterval: NodeJS.Timeout
    if (currentUserId !== displayUserId) {
      pollInterval = setInterval(fetchMessages, 5000)
    }

    return () => {
      supabase.removeChannel(channel)
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [currentUserId, otherUser.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || isSending) return

    const tempId = Date.now().toString()
    const newMsg = {
      id: tempId,
      sender_id: currentUserId,
      receiver_id: otherUser.id,
      content: inputText.trim(),
      created_at: new Date().toISOString(),
      is_read: false
    }

    setMessages(prev => [...prev, newMsg])
    setInputText('')
    setIsSending(true)

    try {
      const res = await sendMessage(otherUser.id, newMsg.content)
      // re-fetch to get real ID
      fetchMessages()

      // 봇인 경우 클라이언트에서 응답 대기 (Vercel 타임아웃/강제종료 방지)
      if (res?.isAi) {
        setIsAiTyping(true)
        fetch('/api/ai-reply-dm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ senderId: currentUserId, botId: otherUser.id, message: newMsg.content })
        }).finally(() => {
          setIsAiTyping(false)
        })
      }
    } catch (e: any) {
      toast.error('메시지 전송 실패')
      setMessages(prev => prev.filter(m => m.id !== tempId))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-210px)] md:h-[calc(100vh-140px)] mb-16 md:mb-0 bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-4 border-b flex items-center gap-3">
        {otherUser.avatar_url ? (
          <img src={otherUser.avatar_url} className="w-10 h-10 rounded-full object-cover border" alt="" />
        ) : (
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">?</div>
        )}
        <div>
          <Link href={`/users/${otherUser.id}`} className="font-bold text-gray-900 hover:underline">
            {otherUser.display_name}
          </Link>
          {otherUser.is_ai && <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">AI Bot</span>}
          <div className="text-xs text-gray-500">@{otherUser.username}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg, idx) => {
          const isMine = msg.sender_id === bubbleOwnerId
          return (
            <div key={msg.id || idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${isMine ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-900 rounded-bl-none shadow-sm'}`}>
                {msg.content}
              </div>
            </div>
          )
        })}
        {isAiTyping && (
          <div className="flex justify-start">
            <div className="max-w-[70%] rounded-2xl px-4 py-3 text-sm bg-white border border-gray-200 text-gray-500 rounded-bl-none shadow-sm flex items-center gap-2">
              <span className="animate-pulse">●</span>
              <span className="animate-pulse delay-75">●</span>
              <span className="animate-pulse delay-150">●</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t rounded-b-xl">
        <form onSubmit={handleSend} className="flex gap-2">
          <input 
            type="text" 
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="flex-1 bg-gray-100 border-none px-4 py-2.5 rounded-full text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button 
            type="submit" 
            disabled={!inputText.trim() || isSending}
            className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-50 hover:bg-blue-700 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </form>
      </div>
    </div>
  )
}
