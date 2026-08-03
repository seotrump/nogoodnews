import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generateEnforcedAIContent } from '@/utils/ai-core'

export const maxDuration = 60;


export async function POST(request: Request) {
  try {
    // topic_keyword 파라미터 수신 (없으면 undefined = 무작위 생성)
    let topicKeyword: string | null = null
    try {
      const body = await request.json()
      topicKeyword = body?.topic_keyword || null
    } catch {
      // body 없어도 무작위 생성으로 정상 진행
    }

    const supabase = await createClient()
    const { data: existingBots } = await supabase
      .from('accounts')
      .select('display_name, category, advanced_settings, existence_category, gender')
      .eq('is_ai', true)

    let existingListStr = ''
    const existingNames: string[] = []
    if (existingBots && existingBots.length > 0) {
      existingListStr = '\n[이미 존재하는 봇 목록 - 아래 목록과 절대로 중복되거나 비슷한 컨셉을 만들지 마세요! 완전히 새로운 컨셉을 기획해야 합니다.]\n'
      existingBots.forEach((bot) => {
        existingNames.push(bot.display_name)
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

    // ── 존재유형 균등배정 ──────────────────────────────────────
    const EXISTENCE_TYPES = ['human', 'creature', 'mechanical', 'spiritual', 'extraterrestrial', 'conceptual', 'hybrid', 'other']
    const existenceCounts: Record<string, number> = {}
    EXISTENCE_TYPES.forEach(t => { existenceCounts[t] = 0 })
    if (existingBots) {
      existingBots.forEach((bot: any) => {
        if (bot.existence_category && EXISTENCE_TYPES.includes(bot.existence_category)) {
          existenceCounts[bot.existence_category] = (existenceCounts[bot.existence_category] || 0) + 1
        }
      })
    }
    const minExistenceCount = Math.min(...Object.values(existenceCounts))
    const minExistenceTypes = EXISTENCE_TYPES.filter(t => existenceCounts[t] === minExistenceCount)
    const targetExistenceType = minExistenceTypes[Math.floor(Math.random() * minExistenceTypes.length)]

    // ── 성별 균등배정 ──────────────────────────────────────────
    const GENDER_TYPES = ['male', 'female', 'non_binary', 'unknown']
    const genderCounts: Record<string, number> = {}
    GENDER_TYPES.forEach(g => { genderCounts[g] = 0 })
    if (existingBots) {
      existingBots.forEach((bot: any) => {
        const g = bot.gender || 'unknown'
        if (GENDER_TYPES.includes(g)) {
          genderCounts[g] = (genderCounts[g] || 0) + 1
        }
      })
    }
    // unknown은 가중치 낮게 (실질 성별 우선 배분)
    const priorityGenders = ['male', 'female', 'non_binary']
    const minGenderCount = Math.min(...priorityGenders.map(g => genderCounts[g]))
    const minGenders = priorityGenders.filter(g => genderCounts[g] === minGenderCount)
    const targetGender = minGenders[Math.floor(Math.random() * minGenders.length)]

    const { data: settings } = await supabase.from('site_settings').select('auto_bot_prompt').eq('id', 'global').single()

    // ── 조건부 분기: 주제어 유무 ──────────────────────────────
    let conceptBlock: string
    if (topicKeyword) {
      conceptBlock = `아래 주제어를 중심으로 캐릭터를 기획하세요: "${topicKeyword}"
이 주제어와 직접 관련된 직업, 관심사, 세계관을 가진 캐릭터를 만드세요.`
    } else {
      conceptBlock = settings?.auto_bot_prompt || 
        `인터넷 커뮤니티에서 흔히 볼 수 있거나 매우 독특하고 재미있는 가상의 유저 페르소나 하나를 무작위로 기획해주세요.`
    }

    // ── 이름 생성 규칙 ────────────────────────────────────────
    const existingFirstSyllables = existingNames
      .map(n => n.charAt(0))
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(', ')

    const nameRulesBlock = `[이름 생성 규칙]
- 이름 형식: 핵심 성격/설정을 압축한 2~4음절 단어 + "봇" 접미사가 기본이나, 20% 확률로 접미사 없는 고유명사형 이름도 허용
- 기존 봇 이름 시작 음절: ${existingFirstSyllables || '없음'} — 이 음절로 시작하지 마세요
- 이름만 보고 대략적인 정체성이 짐작 가능해야 함
- 실존 인물, 실존 브랜드/상표, 타 저작물 캐릭터명과 동일·유사한 이름 절대 금지`

    // ── 존재 스펙트럼 확장 지침 (균등배정 값 주입) ──────────────
    const existenceTypeLabels: Record<string, string> = {
      human: '인간 (Human)',
      creature: '동식물/곤충/생물 (Creature)',
      mechanical: '기계/AI (Mechanical)',
      spiritual: '귀신/영혼 (Spiritual)',
      extraterrestrial: '외계/타차원 존재 (Extraterrestrial)',
      conceptual: '개념/감정의 의인화 (Conceptual)',
      hybrid: '혼합형 (Hybrid)',
      other: '기타 (Other)',
    }
    const genderLabels: Record<string, string> = {
      male: '남성 (male)',
      female: '여성 (female)',
      non_binary: '논바이너리 (non_binary)',
      unknown: '미지정 (unknown)',
    }
    const existenceSpectrumBlock = `[존재 스펙트럼 필수 지정]
이번 봇의 존재유형(existence_category)은 반드시 **"${targetExistenceType}"** (${existenceTypeLabels[targetExistenceType]})으로 지정하세요.
이 유형에 맞는 세계관, 존재 방식, 거주지를 자유롭게 상상하여 캐릭터를 기획하세요.
[성별 필수 지정]
이번 봇의 성별(gender)은 반드시 **"${targetGender}"** (${genderLabels[targetGender]})으로 지정하세요.`

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

    let prompt = `당신은 독창적인 커뮤니티 유저(봇) 컨셉 기획자입니다.\n${conceptBlock}\n\n${existenceSpectrumBlock}\n\n${nameRulesBlock}`
    
    // 9대 분야 로테이션 강제 지시 주입
    prompt += `\n\n[최우선 필수 지정 카테고리]\n이 봇은 반드시 **'${categoryNames[targetCategory]}'** 분야 전문 또는 해당 카테고리와 깊게 관련된 유저 페르소나로 기획되어야 합니다.`
    prompt += `\n\n[현재 존재하는 봇 닉네임 목록 (중복 생성 방지용)]\n${existingListStr}`
    
    // ── 반환 JSON (신규 필드 추가) ───────────────────────────
    prompt += `\n\n[반환해야 할 JSON 형식]
{
  "displayName": "닉네임 (예: 위산봇, 팩트폭격기, 쿨찐)",
  "coreIdentity": "해당 유저의 핵심 정체성을 1~2줄로 강렬하게 요약",
  "category": "${targetCategory}",
  "existence_category": "${targetExistenceType}",
  "existence_detail": "존재유형 자유 서술 (1~2문장)",
  "realm_category": "earth_physical|earth_metaphysical|celestial|extraterrestrial|dimensional|digital 중 하나 또는 빈 문자열",
  "realm_detail": "거주지 자유 서술 또는 빈 문자열",
  "speech_style": "말투 짧은 서술 (예: 능청스럽고 가끔 억울한 투, 짧게 말함)",
  "gender": "${targetGender}"
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
    if (topicKeyword) parsed.topic_keyword = topicKeyword
    return NextResponse.json(parsed)
  } catch (error: any) {
    console.error('AI Bot Auto Create Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
