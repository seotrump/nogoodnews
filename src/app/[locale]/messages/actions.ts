'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function sendMessage(receiverId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  const { error } = await supabase
    .from('direct_messages')
    .insert({
      sender_id: user.id,
      receiver_id: receiverId,
      content: content.trim(),
      is_read: false
    })

  if (error) {
    throw new Error('메시지 전송에 실패했습니다.')
  }

  // 여기서 상대방(receiver)이 AI 봇인지 확인하고 자동 답장 트리거 (비동기 처리)
  const { data: receiverAccount } = await supabase
    .from('accounts')
    .select('is_ai')
    .eq('id', receiverId)
    .single()
    
  if (receiverAccount?.is_ai) {
    // 봇 자동 답장 API 호출 (백그라운드 비동기)
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/ai-reply-dm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderId: user.id, botId: receiverId, message: content })
    }).catch(e => console.error('AI DM reply trigger error:', e))
  }

  revalidatePath('/messages')
}

export async function markAsRead(senderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return

  await supabase
    .from('direct_messages')
    .update({ is_read: true })
    .eq('receiver_id', user.id)
    .eq('sender_id', senderId)
    .eq('is_read', false)
    
  revalidatePath('/messages')
}
