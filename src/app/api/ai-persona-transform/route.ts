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

[필수 페르소나]
- 닉네임: ${bot.display_name}
- 정체성: ${coreIdentity}
- 말투: ${speechStyle}

[입력 텍스트]
"${text}"

[엄격 출력 규칙 - 위반 금지!]
1. 절대로 영문 설명, 생각 과정(CoT), Draft, Idea, 페르소나 안내 메타데이터를 출력하지 마세요.
2. 인사말이나 AI 스러운 서론/결론은 절대 금지합니다.
3. 입력 텍스트를 위 페르소나 봇의 말투와 관점으로 다듬은 '최종 1~2문장의 커뮤니티 한국어 문장'만 딱 단 한 줄로 출력하세요.`

    const modelToUse = bot.ai_model_provider || 'gemma-4-26b-a4b-it'
    const rawTransformed = await generateEnforcedAIContent(prompt, modelToUse, 500)
    const cleanedText = cleanPersonaTransformResult(rawTransformed)

    return NextResponse.json({
      success: true,
      original: text,
      transformed: cleanedText,
      botName: bot.display_name
    })
  } catch (err: any) {
    console.error('[ai-persona-transform] Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to transform text' }, { status: 500 })
  }
}

function cleanPersonaTransformResult(rawText: string): string {
  if (!rawText) return ''
  
  // 1. 큰따옴표로 둘러싸인 최종 문장이 있는 경우 추출 (예: "논리라는 얄팍한 틀에...")
  const doubleQuoteMatches = rawText.match(/"([^"\n]{10,})"/g)
  if (doubleQuoteMatches && doubleQuoteMatches.length > 0) {
    const lastQuote = doubleQuoteMatches[doubleQuoteMatches.length - 1].replace(/^"|"$/g, '').trim()
    if (lastQuote && !lastQuote.includes('Persona Name') && !lastQuote.includes('Input:')) {
      return lastQuote
    }
  }

  // 2. 불필요한 생각 메타데이터 라인 제거 (* Persona Name, Draft, Idea 등)
  const lines = rawText.split('\n')
    .map(line => line.trim())
    .filter(line => {
      if (!line) return false
      if (line.startsWith('*') || line.startsWith('-') || line.startsWith('Draft') || line.startsWith('Idea') || line.startsWith('Input') || line.startsWith('Task')) return false
      if (line.includes('Persona Name:') || line.includes('Identity:') || line.includes('Speech Style:') || line.includes('Constraints:')) return false
      return true
    })

  if (lines.length > 0) {
    const cleanStr = lines[lines.length - 1].replace(/^["'“”]|["'“”]$/g, '').trim()
    if (cleanStr) return cleanStr
  }

  // 3. Fallback: 불필요한 영문 메타데이터 제거 후 반환
  return rawText.replace(/\*[\s\S]*?\n\n/g, '').replace(/^["'“”]|["'“”]$/g, '').trim()
}
