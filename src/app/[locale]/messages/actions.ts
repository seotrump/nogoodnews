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

// 파일럿(탑승) 상태를 확인하고 권한이 있는지 검증하는 유틸리티
async function getPilotInfo(user: any) {
  const cookieStore = await cookies()
  const pilotBotId = cookieStore.get('active_persona_id')?.value || null
  const hasAdmin = isAdmin(user)
  
  let isPiloting = false
  let effectiveUserId = user.id

  if (pilotBotId) {
    if (hasAdmin) {
      effectiveUserId = pilotBotId
      isPiloting = true
    } else {
      // 관리자가 아니면 소유자인지 확인
      const { data: botAccount } = await supabaseAdmin
        .from('accounts')
        .select('claimed_by_user_id')
        .eq('id', pilotBotId)
        .single()

      if (botAccount && botAccount.claimed_by_user_id === user.id) {
        effectiveUserId = pilotBotId
        isPiloting = true
      }
    }
  }

  return { effectiveUserId, isPiloting }
}

export async function sendMessage(receiverId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  const { effectiveUserId: effectiveSenderId, isPiloting } = await getPilotInfo(user)
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

  // 봇 자동 답장 트리거
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

  const { effectiveUserId: effectiveReceiverId, isPiloting } = await getPilotInfo(user)
  const dbClient = isPiloting ? supabaseAdmin : supabase

  await dbClient
    .from('direct_messages')
    .update({ is_read: true })
    .eq('receiver_id', effectiveReceiverId)
    .eq('sender_id', senderId)
    .eq('is_read', false)
    
  revalidatePath('/messages')
}

export async function deleteConversation(otherUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  const { effectiveUserId, isPiloting } = await getPilotInfo(user)
  const dbClient = isPiloting ? supabaseAdmin : supabase

  // upsert로 기존에 숨김 기록이 있으면 시간만 갱신
  const { error } = await dbClient
    .from('direct_messages_hidden')
    .upsert({
      user_id: effectiveUserId,
      other_user_id: otherUserId,
      hidden_at: new Date().toISOString()
    }, {
      onConflict: 'user_id, other_user_id'
    })

  if (error) {
    console.error('deleteConversation error:', error)
    throw new Error('대화방 나가기에 실패했습니다.')
  }

  revalidatePath('/messages')
  return { success: true }
}

export async function getMessages(otherUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const { effectiveUserId, isPiloting } = await getPilotInfo(user)
  const dbClient = isPiloting ? supabaseAdmin : supabase

  // 해당 사용자의 hidden_at 시간 가져오기
  const { data: hiddenData } = await dbClient
    .from('direct_messages_hidden')
    .select('hidden_at')
    .eq('user_id', effectiveUserId)
    .eq('other_user_id', otherUserId)
    .single()

  let query = dbClient
    .from('direct_messages')
    .select('*')
    .or(`and(sender_id.eq.${effectiveUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${effectiveUserId})`)

  if (hiddenData?.hidden_at) {
    query = query.gt('created_at', hiddenData.hidden_at)
  }

  const { data, error } = await query.order('created_at', { ascending: true })

  if (error) {
    console.error('getMessages error:', error)
    return []
  }

  return data || []
}
