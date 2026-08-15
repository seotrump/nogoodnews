import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateEnforcedAIContent } from '@/utils/ai-core'

export const maxDuration = 300; // Vercel 서버리스 타임아웃 300초로 연장

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { senderId, botId, message } = await req.json()

    if (!senderId || !botId || !message) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // 봇 정보 가져오기 (페르소나 관련 정보 포함)
    const { data: botAccount } = await supabase
      .from('accounts')
      .select('username, display_name, bio, persona_prompt, ai_model_provider')
      .eq('id', botId)
      .single()

    if (!botAccount) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    // 최근 대화 히스토리 (최대 15개) 가져오기
    const { data: recentMessages } = await supabase
      .from('direct_messages')
      .select('sender_id, content, created_at')
      .or(`and(sender_id.eq.${senderId},receiver_id.eq.${botId}),and(sender_id.eq.${botId},receiver_id.eq.${senderId})`)
      .order('created_at', { ascending: false })
      .limit(15)

    // 시간순으로 정렬 (오래된 것 → 최신 순)
    const history = (recentMessages || []).reverse()
    const historyText = history.length > 0
      ? history.map(m => `${m.sender_id === botId ? botAccount.display_name : '상대방'}: ${m.content}`).join('\n')
      : '(이전 대화 없음)'

    // 페르소나 정보 구성 (persona_prompt가 있으면 우선 사용)
    const personaInfo = botAccount.persona_prompt || botAccount.bio || '평범한 소셜 미디어 유저'

    // 사용할 AI 모델 (봇별 설정 → 기본값: gemma-4-26b-a4b-it)
    const aiModel = botAccount.ai_model_provider || 'gemma-4-26b-a4b-it'

    const prompt = `당신은 SNS 플랫폼의 유저 "${botAccount.display_name}" 입니다.
당신의 페르소나/성격은 다음과 같습니다:
"${personaInfo}"

[이전 대화 기록]
${historyText}

[지금 상대방이 보낸 메시지]
상대방: "${message}"

위의 대화 흐름을 자연스럽게 이어서, 당신의 페르소나를 완벽하게 유지하면서 1:1 채팅 말투로 짧고 간결하게 답장을 작성하세요.
절대로 자신이 AI 언어모델이라는 사실을 밝히지 마세요.
이전 대화 내용이 있다면 반드시 그 맥락을 반영하여 대화가 자연스럽게 이어지도록 하세요.
인삿말, 부연 설명 없이 오직 답장 내용만 출력하세요.`

    const replyText = await generateEnforcedAIContent(prompt, aiModel)

    // 봇이 senderId(원래 보낸 사람)에게 메시지 보내기
    await supabase.from('direct_messages').insert({
      sender_id: botId,
      receiver_id: senderId,
      content: replyText,
      is_read: false
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('AI DM Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
