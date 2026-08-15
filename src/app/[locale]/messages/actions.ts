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

  console.log(`[DM] 수신자 확인 - id: ${receiverId}, is_ai: ${receiverAccount?.is_ai}, name: ${receiverAccount?.display_name}`)

  if (receiverAccount?.is_ai === true) {
    // SITE_URL: Vercel 환경변수 순서대로 폴백
    const siteUrl = 
      process.env.NEXT_PUBLIC_SITE_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      'https://nogoodnews.com'

    console.log(`[DM] 봇 자동 답장 트리거 → ${siteUrl}/api/ai-reply-dm (bot: ${receiverAccount.display_name})`)

    fetch(`${siteUrl}/api/ai-reply-dm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderId: user.id, botId: receiverId, message: content.trim() })
    }).catch(e => console.error('[DM] ai-reply-dm 호출 실패:', e.message))
  } else {
    console.log(`[DM] 수신자(${receiverId})는 봇이 아니므로 자동 답장 없음`)
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
