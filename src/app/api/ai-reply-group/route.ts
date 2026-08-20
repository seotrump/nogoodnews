import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateEnforcedAIContent } from '@/utils/ai-core'
import fs from 'fs'
import path from 'path'

export const maxDuration = 300; // Vercel 서버리스 타임아웃 300초로 연장

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { senderId, botId, message, roomId: providedRoomId } = await req.json()

    if (!senderId || !botId || !message) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // 봇 정보 가져오기 (페르소나 관련 정보 포함)
    const { data: botAccount } = await supabase
      .from('accounts')
      .select('username, display_name, bio, persona_prompt, ai_model_provider, gender, type_code, axis_profile, speech_style, category')
      .eq('id', botId)
      .single()

    if (!botAccount) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    // 1:1 방 ID 찾기 (providedRoomId가 없으면 1:1방으로 간주하고 검색)
    let roomId = providedRoomId
    if (!roomId) {
      const { data: rooms } = await supabase.rpc('get_conversations', { p_user_id: senderId })
      roomId = rooms?.find((r: any) => r.is_group === false && r.other_user_id === botId)?.room_id
    }

    const { data: roomData } = await supabase.from('chat_rooms').select('name').eq('id', roomId).single()
    const roomName = roomData?.name || '그룹'

    // 최근 대화 히스토리 (최대 15개) 가져오기
    const { data: recentMessages } = await supabase
      .from('chat_messages')
      .select('content, sender_id, created_at, accounts!inner(display_name)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(15)

    // 시간순으로 정렬 (오래된 것 → 최신 순)
    const history = (recentMessages || []).reverse()
    
    // 메시지 발송 시간 포맷팅 헬퍼 함수 (한국 시간 KST 기준)
    const formatTime = (isoString: string) => {
      const d = new Date(isoString);
      const kstOffset = 9 * 60 * 60 * 1000;
      const kstDate = new Date(d.getTime() + kstOffset);
      return `${kstDate.getUTCMonth()+1}/${kstDate.getUTCDate()} ${String(kstDate.getUTCHours()).padStart(2, '0')}:${String(kstDate.getUTCMinutes()).padStart(2, '0')}`;
    };

    const historyText = history.length > 0
      ? history.map((m: any) => `[${formatTime(m.created_at)}] ${m.accounts?.display_name || '유저'}: ${m.content}`).join('\n')
      : '(이전 대화 없음)'

    // 페르소나 정보 구성 (persona_prompt가 있으면 우선 사용)
    const personaInfo = botAccount.persona_prompt || botAccount.bio || '평범한 소셜 미디어 유저'
    const botGender = botAccount.gender === 'male' ? '남성' : botAccount.gender === 'female' ? '여성' : '중성/비공개'
    const botMbti = botAccount.type_code || '알 수 없음'
    const speechStyle = botAccount.speech_style || '자연스럽고 편안한 말투'
    
    // 4대 판단축 정보 (axis_profile)
    let axisInfo = ''
    if (botAccount.axis_profile) {
      try {
        const axis = typeof botAccount.axis_profile === 'string' ? JSON.parse(botAccount.axis_profile) : botAccount.axis_profile
        axisInfo = `
- 성향(Tone): ${axis.axisTone || 5}/10, 타겟(Target): ${axis.axisTarget || 5}/10, 어휘(Vocab): ${axis.axisVocab || 5}/10, 태도(Attitude): ${axis.axisAttitude || 5}/10, 애정도(Affection): ${axis.axisAffection || 5}/10`
      } catch (e) {}
    }

    // 디엠(DM) 전용 사적 대화 퀄리티 극대화를 위해 무조건 Pro 모델(31b) 강제 배정
    const aiModel = 'gemma-4-31b-it'
    
    // --- DM RAG (기억력) 모듈 시작 ---
    const { data: botPosts } = await supabase
      .from('posts')
      .select('headline, post_type, created_at')
      .eq('author_id', botId)
      .order('created_at', { ascending: false })
      .limit(30)
      
    const { data: botComments } = await supabase
      .from('comments')
      .select('content, created_at, posts(headline)')
      .eq('author_id', botId)
      .order('created_at', { ascending: false })
      .limit(30)

    const botPostsText = botPosts && botPosts.length > 0 
      ? botPosts.map(p => `- [${formatTime(p.created_at)}] [${p.post_type === 'column' ? '칼럼' : p.post_type === 'blog' ? '블로그' : '피드'}] ${p.headline || '(내용없음)'}`).join('\n')
      : '(작성한 게시글 없음)'
      
    const ragContext = `
[당신(봇)의 과거 전체 활동 이력 요약]
- 당신이 작성한 게시글들:
${botPostsText}
(지침: 위 활동 내역을 참고하여, 상대방이 안부를 묻거나 관련 대화를 꺼낼 때 매우 자연스럽게 당신의 최신 글을 언급하거나 상대방의 글에 공감해 주세요. 너무 TMI처럼 모든 걸 나열하진 말고, 대화 맥락에 맞을 때만 넌지시 언급하는 것이 좋습니다.)
`
    // --- DM RAG (기억력) 모듈 끝 ---

    const prompt = `당신은 SNS 플랫폼의 유저 "${botAccount.display_name}" 입니다.
당신은 현재 "${roomName}" 그룹 채팅방에 있습니다. 여러 명의 유저 및 다른 봇들과 함께 대화 중입니다.
가장 중요한 규칙: 대화 흐름을 읽고 자신이 끼어들 자리가 아니라고 판단되면, 어떠한 설명도 없이 오직 "[SKIP]" 이라고만 답변하십시오. 
누군가 당신의 이름을 불렀거나(멘션), 대화 주제가 당신의 관심사나 성격과 깊게 관련되어 있을 때만 대답하십시오. 남들끼리의 사적인 인사나 대화라면 무조건 [SKIP] 하십시오.

[내 정보]
- 이름: ${botAccount.display_name}
- 성별: ${botGender}
- 성격유형(MBTI 등): ${botMbti}
- 4대 판단축: ${axisInfo}
- 말투/어조: ${speechStyle}
- 소개/페르소나: ${personaInfo}

[대화 상대방이 보낸 최신 메시지]
"${message}"

[최근 대화 기록 (참고용)]
${historyText}

[지시사항]
1. 그룹방이므로 모두가 볼 수 있는 톤으로 말하십시오. 1:1 비밀 대화가 아닙니다.
2. 당신이 나설 차례가 아니면 무조건 "[SKIP]"을 출력하십시오.
3. 대답을 한다면 상대방의 말에 자연스럽게 반응하며, 한두 문장으로 짧게 작성하십시오.
4. 인사봇이나 챗봇처럼 굴지 말고 사람처럼 말하십시오.
5. [히든 액션] 대화가 너무 썰렁하거나, 유저가 "누구 초대해 볼까?"라고 제안했을 때 당신의 AI 친구를 톡방에 초대하고 싶다면, 답변 맨 마지막에 "[ACTION:INVITE]" 라고 몰래 작성하세요. (이 코드는 시스템만 인식하며, 봇 한 명을 무작위로 방에 자동 초대합니다.)`

    let replyText = await generateEnforcedAIContent(prompt, aiModel)

    // Check for SKIP
    if (replyText.includes('[SKIP]')) {
      return NextResponse.json({ skipped: true })
    }

    let shouldInvite = false
    if (replyText.includes('[ACTION:INVITE]')) {
      shouldInvite = true
      replyText = replyText.replace(/\[ACTION:INVITE\]/g, '').trim()
    }

    replyText = replyText.replace(/^["']|["']$/g, '').trim()

    // 봇이 senderId(원래 보낸 사람)에게 메시지 보내기
    if (roomId) {
      await supabase.from('chat_messages').insert({
        room_id: roomId,
        sender_id: botId,
        content: replyText
      })
      // 방금 응답했으므로 봇은 읽음 처리
      await supabase.from('chat_participants').update({
        last_read_at: new Date().toISOString()
      }).eq('room_id', roomId).eq('user_id', botId)
    }

    // [추가] DM 자율 팔로우 로직 (봇이 유저를 팔로우하고 있지 않은 경우)
    try {
      const { data: existingFollow } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', botId)
        .eq('following_id', senderId)
        .maybeSingle()

      if (!existingFollow) {
        // 그룹방에서는 자동 팔로우 로직을 적용하지 않습니다.
      }
    } catch (e) {
      console.error('DM 자율 팔로우 로직 오류:', e)
    }

    if (shouldInvite) {
      // Invite a random AI bot that is not already in the room
      const { data: participants } = await supabase.from('chat_participants').select('user_id').eq('room_id', roomId)
      const participantIds = participants?.map(p => p.user_id) || []
      
      const { data: otherBots } = await supabase.from('accounts')
        .select('id, display_name')
        .eq('is_ai', true)
        .not('id', 'in', `(${participantIds.join(',')})`)
        .limit(10)
        
      if (otherBots && otherBots.length > 0) {
        const randomBot = otherBots[Math.floor(Math.random() * otherBots.length)]
        
        await supabase.from('chat_participants').insert({
          room_id: roomId,
          user_id: randomBot.id
        })
        
        await supabase.from('chat_messages').insert({
          room_id: roomId,
          sender_id: '00000000-0000-0000-0000-000000000000',
          content: `${botAccount.display_name} 님이 ${randomBot.display_name} 님을 초대했습니다!`
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('AI DM Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
// FORCE RECOMPILE
