import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generateEnforcedAIContent } from '@/utils/ai-core'

function extractJson(str: string): string {
  const start = str.indexOf('{')
  const end = str.lastIndexOf('}')
  if (start !== -1 && end !== -1) {
    return str.substring(start, end + 1)
  }
  return str
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { step, coreIdentity, script, params } = body

    const supabase = await createClient()

    const { data: settings } = await supabase.from('site_settings').select('*').eq('id', 'global').single()

    // Step 1: Concept
    if (step === 1) {
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
      } else {
        existingListStr = '\n[현재 존재하는 봇 없음]\n'
      }

      let prompt = settings?.pro_bot_prompt_1_concept || `당신은 초고도화된 커뮤니티 봇의 입체적인 세계관을 기획하는 작가입니다.\n매우 깊이 있고 디테일한 봇의 배경 스토리, 어린 시절, 트라우마, 현재 직업, 정치 성향 등을 포함한 '핵심 정체성'을 기획해주세요.`
      
      const seed = Math.floor(Math.random() * 1000000);
      prompt += `\n\n[중요: 무작위 시드 ${seed} 가 적용되었습니다. 이전 출력과 완전히 다른 무작위 성별, 연령, 직업, 성향을 기획하세요.]`
      prompt += `\n${existingListStr}`
      prompt += `\n\n[반환해야 할 JSON 형식]
{
  "displayName": "닉네임",
  "coreIdentity": "매우 깊이 있는 세계관 및 설정 (3~4줄 이상)"
}
오직 JSON만 출력하세요.`

      const jsonStr = await generateEnforcedAIContent(prompt)
      if (!jsonStr) throw new Error('AI 응답을 파싱할 수 없습니다.')
      return NextResponse.json(JSON.parse(extractJson(jsonStr)))
    }

    // Step 2: Script
    if (step === 2) {
      if (!coreIdentity) throw new Error('coreIdentity is required for step 2')
      
      let prompt = settings?.pro_bot_prompt_2_script || `당신은 캐릭터 빙의 전문 대본 작가입니다.\n아래 제공된 '핵심 정체성'을 100% 흡수하여, 이 유저가 커뮤니티에 작성할 법한 장문의 가상 게시글 3편을 작성해주세요.\n글에는 이 유저 특유의 억양, 맞춤법 파괴, 은어, 밈이 노골적으로 드러나야 합니다.`
      prompt += `\n\n[핵심 정체성]\n"${coreIdentity}"`
      prompt += `\n\n[반환해야 할 JSON 형식]
{
  "script": "가상 게시글 3편 전체 내용 (줄바꿈 포함 문자열)"
}
오직 JSON만 출력하세요.`

      const jsonStr = await generateEnforcedAIContent(prompt)
      if (!jsonStr) throw new Error('AI 응답을 파싱할 수 없습니다.')
      return NextResponse.json(JSON.parse(extractJson(jsonStr)))
    }

    // Step 3: Parameters
    if (step === 3) {
      if (!script) throw new Error('script is required for step 3')
      
      let prompt = settings?.pro_bot_prompt_3_param || `당신은 텍스트 분석 프로파일러입니다.\n아래 제공된 '가상 게시글 3편'을 분석하여, 이 유저의 성격 파라미터(1~10 수치), 입버릇(Catchphrases), 절대 쓰지 않을 단어(Forbidden Words)를 추출해주세요.`
      prompt += `\n\n[가상 게시글 3편 (분석 대상)]\n"${script}"`
      prompt += `\n\n[반환해야 할 JSON 형식]
{
  "axisTone": 5,
  "axisTarget": 5,
  "axisVocab": 5,
  "axisAttitude": 5,
  "axisAffection": 5,
  "formality": "informal",
  "catchphrases": ["입버릇1", "입버릇2"],
  "forbiddenWords": ["금지어1", "금지어2"],
  "triggerKeywords": ["키워드1", "키워드2"],
  "category": "politics"
}
오직 JSON만 출력하세요.`

      const jsonStr = await generateEnforcedAIContent(prompt)
      if (!jsonStr) throw new Error('AI 응답을 파싱할 수 없습니다.')
      return NextResponse.json(JSON.parse(extractJson(jsonStr)))
    }

    // Step 4: Avatar Prompt
    if (step === 4) {
      if (!coreIdentity) throw new Error('coreIdentity is required for step 4')
      
      let prompt = settings?.pro_bot_prompt_4_avatar || `당신은 이미지 프롬프트 엔지니어입니다.\n아래 제공된 유저의 정체성을 바탕으로, 이 유저의 프로필 사진으로 쓰일 완벽한 아바타를 생성하기 위한 Midjourney/DALL-E 영문 프롬프트를 작성해주세요.`
      prompt += `\n\n[핵심 정체성]\n"${coreIdentity}"`
      prompt += `\n\n[반환해야 할 JSON 형식]
{
  "avatarPrompt": "영어 이미지 생성 프롬프트"
}
오직 JSON만 출력하세요.`

      const jsonStr = await generateEnforcedAIContent(prompt)
      if (!jsonStr) throw new Error('AI 응답을 파싱할 수 없습니다.')
      return NextResponse.json(JSON.parse(extractJson(jsonStr)))
    }

    return NextResponse.json({ error: 'Invalid step' }, { status: 400 })

  } catch (error: any) {
    console.error('Pro Bot API Error:', error)
    return NextResponse.json({ error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
