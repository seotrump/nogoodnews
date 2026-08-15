'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { isAdmin } from '@/utils/auth'

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

  // ── 탑승(파일럿) 모드 확인 ──
  const cookieStore = await cookies()
  const pilotBotId = cookieStore.get('active_persona_id')?.value || null
  const hasAdmin = isAdmin(user)
  
  let effectiveSenderId = user.id
  let isPiloting = false

  if (pilotBotId && hasAdmin) {
    effectiveSenderId = pilotBotId
    isPiloting = true
  }

  // 파일럿 모드일 경우 본인의 ID가 아니므로 RLS를 통과하기 위해 supabaseAdmin 사용
  const dbClient = isPiloting ? supabaseAdmin : supabase

  const { error } = await dbClient
    .from('direct_messages')
    .insert({
      sender_id: effectiveSenderId,
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

  // ── 탑승(파일럿) 모드 확인 ──
  const cookieStore = await cookies()
  const pilotBotId = cookieStore.get('active_persona_id')?.value || null
  const hasAdmin = isAdmin(user)
  
  let effectiveReceiverId = user.id
  let isPiloting = false

  if (pilotBotId && hasAdmin) {
    effectiveReceiverId = pilotBotId
    isPiloting = true
  }

  const dbClient = isPiloting ? supabaseAdmin : supabase

  await dbClient
    .from('direct_messages')
    .update({ is_read: true })
    .eq('receiver_id', effectiveReceiverId)
    .eq('sender_id', senderId)
    .eq('is_read', false)
    
  revalidatePath('/messages')
}
