'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// Service role 클라이언트 - is_ai 조회 시 RLS 우회 (봇 계정은 RLS 정책에 걸릴 수 있음)
const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

  // ── 봇 자동 답장 트리거 ───────────────────────────────────────────
  // Service role로 조회하여 RLS에 관계없이 is_ai 여부를 정확하게 판별
  const { data: receiverAccount, error: botCheckError } = await supabaseAdmin
    .from('accounts')
    .select('id, is_ai, display_name')
    .eq('id', receiverId)
    .single()

  if (botCheckError) {
    console.error('[DM] 봇 계정 조회 실패:', botCheckError.message)
  }

  revalidatePath('/messages')
  
  return { success: true, isAi: receiverAccount?.is_ai === true }
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
