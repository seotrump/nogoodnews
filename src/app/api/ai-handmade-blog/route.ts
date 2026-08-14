import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText } from 'ai'

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { botId, keyword } = await req.json()

    if (!botId || !keyword) {
      return NextResponse.json({ error: 'botId and keyword are required' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch bot persona
    const { data: bot } = await supabaseAdmin
      .from('accounts')
      .select('display_name, persona_prompt, ai_model_provider')
      .eq('id', botId)
      .single()

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) throw new Error('API key missing')
    
    const google = createGoogleGenerativeAI({ apiKey })
    
    // Choose model
    let modelId = 'gemini-2.5-pro'
    if (bot.ai_model_provider?.includes('gemma')) {
       modelId = 'gemma-4-31b-it'
    }

    const systemPrompt = `당신은 대한민국 최고의 SEO 마케팅 블로거이자, 페르소나 연기 전문가입니다.
다음 페르소나 설정에 완전히 빙의하여, 타겟 키워드가 완벽히 최적화된 마크다운(Markdown) 형식의 장문 블로그 글을 작성하세요.

[당신의 페르소나]
${bot.persona_prompt || '친절하고 전문적인 블로거'}

[SEO 타겟 키워드]
"${keyword}"

[종합 SEO 점수 100점 달성을 위한 필수 지침 - 반드시 지킬 것!]
1. 제목(H1): 글의 맨 처음은 반드시 "# " 로 시작하고, 그 안에 "${keyword}"를 포함하세요.
2. 도입부 키워드: 첫 번째 문단(시작 100자 이내)에 타겟 키워드를 자연스럽게 노출하세요.
3. 키워드 반복: 본문 전체에 걸쳐 타겟 키워드를 3~7회 정도 자연스럽게 반복하세요.
4. 글자 수: 검색엔진이 좋아하는 깊이 있는 정보성 글로, 최소 1,500자 이상(한국어 기준) 길게 작성하세요.
5. 소제목 계층화: 글 전체를 3개 이상의 소제목("## ")으로 나누어 논리적으로 전개하세요.
6. 가독성(스캐너블): 리스트(불릿 포인트 "- ")와 강조("**강조**")를 적절히 활용하여 모바일에서도 읽기 편하게 구성하세요.
7. 내부 링크: 존재하지 않는 가상의 링크를 억지로 만들지 마세요. 대신 문맥에 맞는 해시태그(예: #관련키워드)를 사용하여 내부 탐색을 유도하세요.
8. 외부 링크: 반드시 실제로 존재하는 공신력 있는 외부 출처(예: 위키백과 등)의 정확한 URL만 사용하세요. 불확실하다면 아예 생략하세요.
9. 미디어(이미지): AI는 실제 이미지를 첨부할 수 없으므로, 엑박이 뜨는 가상의 이미지 URL(![이미지](url))을 절대 만들지 마세요! 이미지는 완전히 생략하고 텍스트 가독성에 집중하세요.
10. 기계적 말투 금지: "결론적으로 말하자면", "요약하자면", "오늘은 ~에 대해 알아보았습니다" 같은 AI 특유의 스팸성 멘트를 절대 사용하지 마세요. 사람 냄새 나는 경험담이나 당신의 페르소나 특유의 말투를 듬뿍 담아내세요.

위 10가지 지침을 모두 반영하여, 마크다운 코드블록(\`\`\`) 없이 순수한 마크다운 텍스트만 출력하세요.`

    const result = streamText({
      model: google(modelId),
      prompt: systemPrompt,
      maxRetries: 1,
    })

    return result.toTextStreamResponse()

  } catch (error: any) {
    console.error('SEO Blog Generation Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
