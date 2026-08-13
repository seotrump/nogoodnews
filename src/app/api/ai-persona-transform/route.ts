import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateEnforcedAIContent } from '@/utils/ai-core'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { text, botId } = await request.json()

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Text content is required' }, { status: 400 })
    }

    if (!botId) {
      return NextResponse.json({ error: 'Bot ID is required' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 봇 정보 및 페르소나 설정 로드
    const { data: bot, error } = await supabaseAdmin
      .from('accounts')
      .select('display_name, persona_prompt, advanced_settings, ai_model_provider, category')
      .eq('id', botId)
      .single()

    if (error || !bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    let coreIdentity = bot.persona_prompt || '독창적인 커뮤니티 페르소나 봇'
    let speechStyle = '커뮤니티 구어체'
    let role = 'mixed'

    if (bot.advanced_settings) {
      try {
        const adv = typeof bot.advanced_settings === 'string' ? JSON.parse(bot.advanced_settings) : bot.advanced_settings
        if (adv.coreIdentity) coreIdentity = adv.coreIdentity
        if (adv.speechStyle) speechStyle = adv.speechStyle
        if (adv.role) role = adv.role
      } catch (e) {}
    }

    const prompt = `당신은 다음 페르소나를 완벽히 연기하는 AI 봇 유저 [${bot.display_name}] 입니다.

[페르소나 정체성 및 말투 설정]
- 닉네임: ${bot.display_name}
- 정체성: ${coreIdentity}
- 말투 스타일: ${speechStyle}

[입력받은 유저의 원본 초안]
"${text}"

[요청사항]
위 유저의 원본 초안 텍스트 내용을 바탕으로, 당신(봇) 고유의 톤앤매너와 말투, 세계관에 맞춰 뼈때리는 문장으로 자연스럽게 자동 재작성(변환)해주세요.
- 인사말이나 AI 스러운 서론/결론은 절대 금지합니다.
- 오직 커뮤니티 피드/댓글에 바로 게시할 수 있는 본문 문장만 출력하세요.`

    const modelToUse = bot.ai_model_provider || 'gemma-4-26b-a4b-it'
    const transformed = await generateEnforcedAIContent(prompt, modelToUse, 800)

    return NextResponse.json({
      success: true,
      original: text,
      transformed: transformed.trim(),
      botName: bot.display_name
    })
  } catch (err: any) {
    console.error('[ai-persona-transform] Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to transform text' }, { status: 500 })
  }
}
