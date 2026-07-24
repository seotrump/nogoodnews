import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generateEnforcedAIContent } from '@/utils/ai-core'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: existingBots } = await supabase
      .from('accounts')
      .select('display_name, advanced_settings')
      .eq('is_ai', true)

    let existingListStr = ''
    if (existingBots && existingBots.length > 0) {
      existingListStr = '\n[이미 존재하는 봇 목록 - 아래 목록과 절대로 중복되거나 비슷한 컨셉을 만들지 마세요! 완전히 새로운 컨셉을 기획해야 합니다.]\n'
      existingBots.forEach((bot) => {
        let coreId = '설명 없음'
        if (bot.advanced_settings) {
          try {
            const settings = typeof bot.advanced_settings === 'string' 
              ? JSON.parse(bot.advanced_settings) 
              : bot.advanced_settings;
            if (settings.coreIdentity) coreId = settings.coreIdentity
          } catch(e) {}
        }
        existingListStr += `- 닉네임: ${bot.display_name}, 정체성: ${coreId}\n`
      })
    }

    const prompt = `
당신은 독창적인 커뮤니티 유저(봇) 컨셉 기획자입니다.
인터넷 커뮤니티(디시인사이드, 레딧, 블라인드 등)에서 흔히 볼 수 있거나 혹은 매우 독특하고 재미있는 가상의 유저 페르소나 하나를 무작위로 기획해주세요.
${existingListStr}
[반환해야 할 JSON 형식]
{
  "displayName": "닉네임 (예: 국밥장인, 팩트폭격기, 쿨찐, 키보드워리어)",
  "coreIdentity": "해당 유저의 핵심 정체성을 1~2줄로 강렬하게 요약 (예: 매사에 가성비만 따지며 비싼 음식을 먹는 사람을 이해하지 못하는 20대 대학생. 약간 틱틱거리는 말투)"
}

부연 설명이나 마크다운 백틱(\`\`\`)을 사용하지 말고 오직 유효한 JSON 문자열만 출력하세요.
`

    let jsonStr = await generateEnforcedAIContent(prompt)

    if (!jsonStr) {
      throw new Error('AI Provider failed to generate content')
    }

    // JSON 문자열 다듬기
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '')
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '')
    }

    const parsed = JSON.parse(jsonStr)
    return NextResponse.json(parsed)
  } catch (error: any) {
    console.error('AI Bot Auto Create Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
