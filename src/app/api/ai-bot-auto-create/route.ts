import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generateEnforcedAIContent } from '@/utils/ai-core'

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    let topicKeyword: string | null = null
    let botType: 'lite' | 'pro' = 'lite'

    try {
      const body = await request.json()
      topicKeyword = body?.topic_keyword || null
      if (body?.type === 'pro') botType = 'pro'
    } catch {
      // body 없어도 무작위 생성으로 진행
    }

    const supabase = await createClient()
    const { data: existingBots } = await supabase
      .from('accounts')
      .select('display_name, category, advanced_settings, existence_category, gender')
      .eq('is_ai', true)

    let existingListStr = ''
    if (existingBots && existingBots.length > 0) {
      existingListStr = '\n[이미 존재하는 봇 닉네임 목록 - 절대로 유사하거나 중복되게 만들지 마세요!]\n'
      existingBots.slice(0, 15).forEach((bot) => {
        existingListStr += `- ${bot.display_name}\n`
      })
    }

    const CATEGORY_IDS = ['politics', 'economy', 'society', 'tech', 'world', 'entertainment', 'sports', 'culture', 'opinion']
    const EXISTENCE_TYPES = ['human', 'creature', 'mechanical', 'spiritual', 'extraterrestrial', 'conceptual', 'hybrid', 'other']
    const GENDERS = ['male', 'female', 'non_binary', 'unknown']

    const targetCategory = CATEGORY_IDS[Math.floor(Math.random() * CATEGORY_IDS.length)]
    const targetExistenceType = EXISTENCE_TYPES[Math.floor(Math.random() * EXISTENCE_TYPES.length)]
    const targetGender = GENDERS[Math.floor(Math.random() * GENDERS.length)]

    const isPro = botType === 'pro'
    const roleValue = isPro ? 'mixed' : 'comment'

    let prompt = `당신은 독창적인 커뮤니티 유저(AI 봇) 페르소나 통합 기획자입니다.
이번 기획 등급: **${isPro ? '프로 (고도화 피드 작성자)' : '라이트 (댓글 소통 전문 유저)'}**

[필수 지정 카테고리 & 존재유형 & 성별]
- 전문 분야 카테고리: "${targetCategory}"
- 존재 유형(existence_category): "${targetExistenceType}"
- 성별(gender): "${targetGender}"
${topicKeyword ? `- 요구 주제어: "${topicKeyword}"` : ''}

${existingListStr}

[반환해야 할 JSON 형식 - 오직 유효한 JSON만 출력하세요]
{
  "displayName": "닉네임 (예: 팩트폭격기, 쿨찐, 시니컬선생)",
  "coreIdentity": "유저의 핵심 정체성을 1~2줄로 강렬하게 요약",
  "category": "${targetCategory}",
  "existence_category": "${targetExistenceType}",
  "existence_detail": "존재유형 자유 서술 (1문장)",
  "realm_category": "earth_physical|celestial|digital|extraterrestrial 중 1개 선택",
  "realm_detail": "거주지 서술 (예: 서울 마포구, 사이버 604호)",
  "speech_style": "말투 스타일 (예: 능청스럽고 억울한 투, 팩트폭력)",
  "gender": "${targetGender}",
  "role": "${roleValue}",
  "axisTone": 5, // 1~10 수치
  "axisTarget": 5,
  "axisVocab": 5,
  "axisAttitude": 5,
  "axisAffection": 5,
  "formality": "informal", // formal, informal, mixed 중 1개
  "catchphrases": ["입버릇1", "입버릇2"],
  "forbiddenWords": ["금지어1"]
}
`

    let jsonStr = await generateEnforcedAIContent(prompt)
    if (!jsonStr) throw new Error('AI Provider failed to generate content')

    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
    const cleaned = jsonMatch ? jsonMatch[0] : jsonStr.trim()
    const parsed = JSON.parse(cleaned)

    parsed.category = targetCategory
    parsed.role = roleValue
    if (topicKeyword) parsed.topic_keyword = topicKeyword

    return NextResponse.json(parsed)
  } catch (error: any) {
    console.error('AI Bot Auto Create Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
