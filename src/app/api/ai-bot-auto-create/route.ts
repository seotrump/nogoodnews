import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generateEnforcedAIContent } from '@/utils/ai-core'

export const maxDuration = 60;


export async function POST() {
  try {
    const supabase = await createClient()
    const { data: existingBots } = await supabase
      .from('accounts')
      .select('display_name, category, advanced_settings')
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

    const CATEGORY_IDS = ['politics', 'economy', 'society', 'tech', 'world', 'entertainment', 'sports', 'culture', 'opinion']
    
    // DB의 기존 봇 카테고리 분포 측정
    const categoryCounts: Record<string, number> = {}
    CATEGORY_IDS.forEach(cat => { categoryCounts[cat] = 0 })
    
    if (existingBots) {
      existingBots.forEach(bot => {
        if (bot.category && CATEGORY_IDS.includes(bot.category)) {
          categoryCounts[bot.category] = (categoryCounts[bot.category] || 0) + 1
        }
      })
    }

    // 최소 개수의 카테고리 중 무작위 1개 선택 (9대 분야 균등 로테이션)
    const minCount = Math.min(...Object.values(categoryCounts))
    const minCategories = CATEGORY_IDS.filter(cat => categoryCounts[cat] === minCount)
    const targetCategory = minCategories[Math.floor(Math.random() * minCategories.length)]

    const { data: settings } = await supabase.from('site_settings').select('auto_bot_prompt').eq('id', 'global').single()
    const defaultPrompt = `당신은 독창적인 커뮤니티 유저(봇) 컨셉 기획자입니다.
인터넷 커뮤니티(디시인사이드, 레딧, 블라인드 등)에서 흔히 볼 수 있거나 혹은 매우 독특하고 재미있는 가상의 유저 페르소나 하나를 기획해주세요.`

    let promptTemplate = settings?.auto_bot_prompt || defaultPrompt
    let prompt = promptTemplate

    // 9대 분야 로테이션 강제 지시 주입
    const categoryNames: Record<string, string> = {
      politics: '정치 (Politics)',
      economy: '경제 (Economy)',
      society: '사회 (Society)',
      tech: 'IT/기술 (Tech)',
      world: '세계 (World)',
      entertainment: '연예 (Entertainment)',
      sports: '스포츠 (Sports)',
      culture: '생활/문화 (Culture)',
      opinion: '오피니언 (Opinion)'
    }
    
    prompt += `\n\n[최우선 필수 지정 카테고리]\n이 봇은 반드시 **'${categoryNames[targetCategory]}'** 분야 전문 또는 해당 카테고리와 깊게 관련된 유저 페르소나로 기획되어야 합니다.`
    prompt += `\n\n[현재 존재하는 봇 닉네임 목록 (중복 생성 방지용)]\n${existingListStr}`
    
    prompt += `\n\n[반환해야 할 JSON 형식]
{
  "displayName": "닉네임 (예: 국밥장인, 팩트폭격기, 쿨찐, 키보드워리어)",
  "coreIdentity": "해당 유저의 핵심 정체성을 1~2줄로 강렬하게 요약",
  "category": "${targetCategory}"
}

부연 설명이나 마크다운 백틱(\`\`\`)을 사용하지 말고 오직 유효한 JSON 문자열만 출력하세요.`

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
    parsed.category = targetCategory
    return NextResponse.json(parsed)
  } catch (error: any) {
    console.error('AI Bot Auto Create Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
