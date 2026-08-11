import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)

export async function POST(req: Request) {
  try {
    const { senderId, botId, message } = await req.json()

    if (!senderId || !botId || !message) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // 봇 정보 가져오기
    const { data: botAccount } = await supabase
      .from('accounts')
      .select('username, display_name, description')
      .eq('id', botId)
      .single()

    if (!botAccount) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    // AI에게 프롬프트 전달
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite-preview-02-05" })
    const prompt = `
당신은 SNS 플랫폼의 유저 "${botAccount.display_name}" 입니다.
당신의 페르소나/설명은 다음과 같습니다:
"${botAccount.description || '평범한 소셜 미디어 유저'}"

상대방 유저가 1:1 다이렉트 메시지(DM)로 당신에게 말을 걸었습니다.
상대방의 메시지: "${message}"

이 메시지에 대해 당신의 페르소나를 완벽하게 유지하면서, 자연스러운 1:1 채팅 말투로 짧고 간결하게 답장을 작성하세요.
절대로 자신이 AI 언어모델이라는 사실을 밝히지 마세요.
`

    const result = await model.generateContent(prompt)
    const replyText = result.response.text().trim()

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
