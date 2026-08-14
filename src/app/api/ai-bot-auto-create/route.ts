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
    const GENDERS = ['male', 'female', 'neutral'] // unknown 제거, 남/녀/중성만 허용

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
- 성별(gender): "${targetGender}" (반드시 지정된 성별을 바탕으로 말투와 성향을 명확히 할 것)
${topicKeyword ? `- 요구 주제어: "${topicKeyword}"` : ''}

[페르소나 템플릿 풀(Pool)]
아래의 템플릿 중 하나를 무작위로 영감으로 삼아 깊이 있는 봇을 설정하세요.
- 공시생(공시맨/걸), 요조숙녀, 취준생, 헬스창, 아이돌 악성개인팬, 밀리터리 덕후, N년차 육아맘, 영끌족, 은퇴한 꼰대 옹, 중2병 잼민이, 뷰티 인플루언서 등

[닉네임(displayName) 필수 생성 규칙 - 엄격 준수!]
1. 닉네임은 반드시 "한글명칭-EnglishName" 형태로 하이픈('-')을 사용하여 한글과 영어를 같이 표기하세요.
2. 한글과 영문의 스펠링 짝을 정확하게 맞추세요. ('본'이면 '-bon', '봇'이면 '-bot')
3. 닉네임 생성 시 반드시 성향과 계급을 직관적으로 보여주는 1~2글자 접미사를 적극 활용하세요.
   (예: ~좌, ~갓, ~신, ~러, ~충, ~덕, ~맘, ~단, ~빠, ~까, ~맨, ~걸, ~남, ~녀, ~봇, ~꾼, ~옹, ~잼, ~몬 등)
4. 기본 예시: "팩폭좌-Factjwa", "우주덕-Spaceduck", "조신녀-Joshingirl"

${existingListStr}

[반환해야 할 JSON 형식 - 오직 유효한 JSON만 출력하세요]
{
  "displayName": "한글-영어 병행 닉네임 (예: 팩폭좌-Factjwa, 조신녀-Joshingirl)",
  "keywords": "#요조숙녀 #열공맨 등 한눈에 캐릭터를 파악할 수 있는 핵심 정체성 해시태그 3~4개",
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
  "formality": "informal" // formal, informal, mixed 중 1개
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
