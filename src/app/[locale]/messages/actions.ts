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

  // 1. Find existing 1:1 room
  // get_conversations는 숨겨진 방(hidden_at IS NOT NULL)을 반환하지 않으므로, 
  // 방이 중복 생성되는 버그를 막기 위해 chat_participants를 직접 교차 검색합니다.
  const { data: myRooms } = await dbClient
    .from('chat_participants')
    .select('room_id, chat_rooms!inner(is_group, created_at)')
    .eq('user_id', effectiveSenderId)

  let roomId = null
  if (myRooms && myRooms.length > 0) {
    // 중복 방이 있을 경우 가장 최근에 생성된 방을 우선 사용하기 위해 정렬
    myRooms.sort((a, b) => {
      const aTime = new Date((Array.isArray(a.chat_rooms) ? a.chat_rooms[0] : a.chat_rooms)?.created_at || 0).getTime()
      const bTime = new Date((Array.isArray(b.chat_rooms) ? b.chat_rooms[0] : b.chat_rooms)?.created_at || 0).getTime()
      return bTime - aTime
    })

    for (const r of myRooms) {
      const roomInfo = Array.isArray(r.chat_rooms) ? r.chat_rooms[0] : r.chat_rooms
      if (roomInfo && (roomInfo as any).is_group === false) {
        const { data: otherP } = await dbClient
          .from('chat_participants')
          .select('user_id')
          .eq('room_id', r.room_id)
          .eq('user_id', receiverId)
          .maybeSingle()
        if (otherP) {
          roomId = r.room_id
          break
        }
      }
    }
  }

  // 2. Create room if it doesn't exist
  if (!roomId) {
    const { data: newRoom, error: roomError } = await supabaseAdmin
      .from('chat_rooms')
      .insert({ is_group: false })
      .select('id')
      .single()
      
    if (roomError) throw new Error('방 생성 실패')
    roomId = newRoom.id

    await supabaseAdmin.from('chat_participants').insert([
      { room_id: roomId, user_id: effectiveSenderId },
      { room_id: roomId, user_id: receiverId }
    ])
  } else {
    // 상대방이 숨겼을 수 있으므로 participant 복구
    await dbClient.from('chat_participants')
      .update({ hidden_at: null })
      .eq('room_id', roomId)
  }

  // 3. Insert message
  const { error } = await dbClient
    .from('chat_messages')
    .insert({
      room_id: roomId,
      sender_id: effectiveSenderId,
      content: content.trim()
    })

  if (error) {
    throw new Error('메시지 전송에 실패했습니다.')
  }

  // 봇 자동 답장 트리거
  const { data: receiverAccount } = await supabaseAdmin
    .from('accounts')
    .select('id, is_ai, display_name')
    .eq('id', receiverId)
    .single()

  revalidatePath('/messages')
  
  return { success: true, isAi: receiverAccount?.is_ai === true, roomId }
}

export async function markAsRead(otherUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return

  const { effectiveUserId, isPiloting } = await getPilotInfo(user)
  const dbClient = isPiloting ? supabaseAdmin : supabase

  const { data: rooms } = await dbClient
    .rpc('get_conversations', { p_user_id: effectiveUserId })

  const roomId = rooms?.find((r: any) => r.is_group === false && r.other_user_id === otherUserId)?.room_id

  if (roomId) {
    await dbClient
      .from('chat_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('user_id', effectiveUserId)
      
    revalidatePath('/messages')
  }
}

export async function deleteConversation(otherUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  const { effectiveUserId, isPiloting } = await getPilotInfo(user)
  const dbClient = isPiloting ? supabaseAdmin : supabase

  const { data: rooms } = await dbClient
    .rpc('get_conversations', { p_user_id: effectiveUserId })

  const roomId = rooms?.find((r: any) => r.is_group === false && r.other_user_id === otherUserId)?.room_id

  if (roomId) {
    await dbClient
      .from('chat_participants')
      .update({ hidden_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('user_id', effectiveUserId)

    revalidatePath('/messages')
  }
}

export async function leaveGroupChat(roomId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('로그인이 필요합니다.')
  
  const { effectiveUserId, isPiloting } = await getPilotInfo(user)
  const dbClient = isPiloting ? supabaseAdmin : supabase

  await dbClient
    .from('chat_participants')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', effectiveUserId)

  // 시스템 메시지 (누가 나갔는지)
  await supabaseAdmin.from('chat_messages').insert({
    room_id: roomId,
    sender_id: '00000000-0000-0000-0000-000000000000', // 시스템 봇
    content: `사용자가 퇴장했습니다.`
  })

  revalidatePath('/messages')
}

export async function inviteToGroupChat(roomId: string, userIdsToInvite: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('로그인이 필요합니다.')

  // Check if current user is in the room
  const { data: participants } = await supabaseAdmin
    .from('chat_participants')
    .select('user_id')
    .eq('room_id', roomId)

  if (!participants?.some(p => p.user_id === user.id)) {
    throw new Error('권한이 없습니다.')
  }

  // Insert new participants
  const inserts = userIdsToInvite.map(uid => ({
    room_id: roomId,
    user_id: uid
  }))

  await supabaseAdmin.from('chat_participants').insert(inserts)

  // Send system message
  const { data: invitedUsers } = await supabaseAdmin.from('accounts').select('display_name').in('id', userIdsToInvite)
  if (invitedUsers && invitedUsers.length > 0) {
    const names = invitedUsers.map(u => u.display_name).join(', ')
    await supabaseAdmin.from('chat_messages').insert({
      room_id: roomId,
      sender_id: '00000000-0000-0000-0000-000000000000',
      content: `${names} 님이 초대되었습니다.`
    })
  }

  revalidatePath('/messages')
}

export async function getMessages(otherUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { effectiveUserId, isPiloting } = await getPilotInfo(user)
  const dbClient = isPiloting ? supabaseAdmin : supabase

  // 방을 찾기 위해 모든 participant 검색 (숨겨진 방 포함)
  const { data: participants } = await dbClient
    .from('chat_participants')
    .select('room_id, chat_rooms!inner(is_group, created_at)')
    .eq('user_id', effectiveUserId)
    
  if (!participants) return []

  // 중복 방이 있을 경우 가장 최근에 생성된 방을 우선 사용하기 위해 정렬
  participants.sort((a, b) => {
    const aTime = new Date((Array.isArray(a.chat_rooms) ? a.chat_rooms[0] : a.chat_rooms)?.created_at || 0).getTime()
    const bTime = new Date((Array.isArray(b.chat_rooms) ? b.chat_rooms[0] : b.chat_rooms)?.created_at || 0).getTime()
    return bTime - aTime
  })

  // 내가 속한 1:1 방들 중 상대방이 있는 방 찾기
  let targetRoomId = null
  for (const p of participants) {
    const roomInfo = Array.isArray(p.chat_rooms) ? p.chat_rooms[0] : p.chat_rooms
    if (roomInfo && (roomInfo as any).is_group === false) {
      const { data: otherP } = await dbClient
        .from('chat_participants')
        .select('user_id')
        .eq('room_id', p.room_id)
        .eq('user_id', otherUserId)
        .maybeSingle()
        
      if (otherP) {
        targetRoomId = p.room_id
        // 중요한 버그 수정: 여러 방이 중복 생성되었을 경우 가장 최신 방을 가져오도록 해야 하지만,
        // 위에서 sendMessage를 수정하여 이제 방이 1개만 존재하도록 보장했습니다.
        break
      }
    }
  }

  if (!targetRoomId) return []

  // 현재 유저의 hidden_at 가져오기
  const { data: myParticipant } = await dbClient
    .from('chat_participants')
    .select('hidden_at')
    .eq('room_id', targetRoomId)
    .eq('user_id', effectiveUserId)
    .single()

  let query = dbClient
    .from('chat_messages')
    .select('*')
    .eq('room_id', targetRoomId)

  if (myParticipant?.hidden_at) {
    query = query.gt('created_at', myParticipant.hidden_at)
  }

  const { data, error } = await query.order('created_at', { ascending: true })

  if (error) {
    console.error('getMessages error:', error)
    return []
  }

  return data || []
}

export async function createGroupChat(name: string, participantIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }
  const { effectiveUserId, isPiloting } = await getPilotInfo(user)
  const dbClient = isPiloting ? supabaseAdmin : supabase
  // 방 생성은 RLS RETURNING 이슈 방지를 위해 Admin 클라이언트 사용
  const { data: newRoom, error: roomError } = await supabaseAdmin
    .from('chat_rooms')
    .insert({ name: name || null, is_group: true })
    .select('id')
    .single()
    
  if (roomError) {
    console.error('Room creation error:', roomError)
    throw new Error(`그룹 채팅방 생성 실패: ${roomError.message}`)
  }
  const roomId = newRoom.id

  // 참가자 추가 (나 포함)
  const allParticipants = Array.from(new Set([effectiveUserId, ...participantIds]))
  
  const participantData = allParticipants.map(id => ({
    room_id: roomId,
    user_id: id
  }))

  const { error: partError } = await supabaseAdmin
    .from('chat_participants')
    .insert(participantData)

  if (partError) {
    console.error('Participant insert error:', partError)
    throw new Error('참여자 추가 실패')
  }

  revalidatePath('/messages')
  return roomId
}

export async function sendGroupMessage(roomId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('로그인이 필요합니다.')

  const { effectiveUserId, isPiloting } = await getPilotInfo(user)
  const dbClient = isPiloting ? supabaseAdmin : supabase

  // 방 참가자들 숨김 해제
  await dbClient.from('chat_participants')
    .update({ hidden_at: null })
    .eq('room_id', roomId)

  // 메시지 삽입
  const { error } = await dbClient
    .from('chat_messages')
    .insert({
      room_id: roomId,
      sender_id: effectiveUserId,
      content: content.trim()
    })

  if (error) throw new Error('메시지 전송에 실패했습니다.')

  // 그룹방 내의 봇 목록 가져오기 (자동 답장 트리거용)
  const { data: participants } = await dbClient
    .from('chat_participants')
    .select('user_id')
    .eq('room_id', roomId)
    .neq('user_id', effectiveUserId)

  revalidatePath('/messages')
  
  if (participants) {
    const participantIds = participants.map(p => p.user_id)
    const { data: bots } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .in('id', participantIds)
      .eq('is_ai', true)

    if (bots && bots.length > 0) {
      return { success: true, aiBots: bots.map(b => b.id) }
    }
  }

  return { success: true, aiBots: [] }
}
