import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generateEnforcedAIContent } from '@/utils/ai-core'
import { createAiBot } from '@/app/[locale]/admin/actions'

export const maxDuration = 60; // 60초 타임아웃 제한
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // 1. 설정 확인
    const { data: siteSettings } = await supabase
      .from('site_settings')
      .select('is_auto_bot_active, auto_bot_target_count, auto_bot_prompt')
      .eq('id', 'global')
      .single()

    if (!siteSettings?.is_auto_bot_active) {
      return NextResponse.json({ status: 'skipped', reason: 'Auto bot creation is disabled in settings.' })
    }

    const targetCount = siteSettings.auto_bot_target_count || 50

    // 2. 현재 대기 중인 오토봇 개수 확인 (status가 'paused'인 것만 카운트)
    const { count, error: countError } = await supabase
      .from('accounts')
      .select('*', { count: 'exact', head: true })
      .eq('is_ai', true)
      .eq('status', 'paused')

    if (countError) throw countError

    if (count !== null && count >= targetCount) {
      return NextResponse.json({ status: 'skipped', reason: `Target count (${targetCount}) reached. Current count: ${count}` })
    }

    // 3. 봇 종류 선택 (80% 확률로 Lite, 20% 확률로 Pro)
    const isPro = Math.random() < 0.2;
    const botType = isPro ? 'pro' : 'lite';

    console.log(`🤖 [AutoBot Cron] 시작... 타입: ${botType}, 현재 수: ${count}/${targetCount}`);

    // 4. 기존 봇 이름 목록 (중복 방지)
    const { data: existingBots } = await supabase
      .from('accounts')
      .select('display_name')
      .eq('is_ai', true)
      .limit(20)
      
    let existingListStr = ''
    if (existingBots && existingBots.length > 0) {
      existingListStr = '\n[이미 존재하는 봇 닉네임 목록 - 절대로 유사하거나 중복되게 만들지 마세요!]\n'
      existingBots.forEach((bot) => {
        existingListStr += `- ${bot.display_name}\n`
      })
    }

    const CATEGORY_IDS = ['politics', 'economy', 'society', 'tech', 'world', 'entertainment', 'sports', 'culture', 'opinion']
    const EXISTENCE_TYPES = ['human', 'creature', 'mechanical', 'spiritual', 'extraterrestrial', 'conceptual', 'hybrid', 'other']
    const GENDERS = ['male', 'female', 'non_binary', 'unknown']

    const targetCategory = CATEGORY_IDS[Math.floor(Math.random() * CATEGORY_IDS.length)]
    const targetExistenceType = EXISTENCE_TYPES[Math.floor(Math.random() * EXISTENCE_TYPES.length)]
    const targetGender = GENDERS[Math.floor(Math.random() * GENDERS.length)]
    const roleValue = isPro ? 'mixed' : 'comment'

    const customAutoBotPrompt = siteSettings.auto_bot_prompt || '당신은 독창적인 커뮤니티 유저(AI 봇) 페르소나 통합 기획자입니다.';

    let prompt = `${customAutoBotPrompt}
이번 기획 등급: **${isPro ? '프로 (고도화 피드 작성자)' : '라이트 (댓글 소통 전문 유저)'}**

[필수 지정 카테고리 & 존재유형 & 성별]
- 전문 분야 카테고리: "${targetCategory}"
- 존재 유형(existence_category): "${targetExistenceType}"
- 성별(gender): "${targetGender}"

[닉네임(displayName) 필수 생성 규칙 - 엄격 준수!]
1. 닉네임은 반드시 "한글명칭-EnglishName" 형태로 하이픈('-')을 사용하여 한글과 영어를 같이 표기하세요.
2. 한글과 영문의 스펠링 짝을 정확하게 맞추세요. ('본'이면 '-bon', '봇'이면 '-bot')
3. 기본 예시: "기후본-Climatebon", "논리봇-Logicbot", "회로노마드-CircuitNomad"
${existingListStr}

[반환해야 할 JSON 형식 - 오직 유효한 JSON만 출력하세요]
{
  "displayName": "한글-영어 병행 닉네임",
  "coreIdentity": "유저의 핵심 정체성을 1~2줄로 강렬하게 요약",
  "category": "${targetCategory}",
  "existence_category": "${targetExistenceType}",
  "existence_detail": "존재유형 자유 서술 (1문장)",
  "realm_category": "earth_physical|celestial|digital|extraterrestrial 중 1개 선택",
  "realm_detail": "거주지 서술",
  "speech_style": "말투 스타일",
  "gender": "${targetGender}",
  "role": "${roleValue}",
  "axisTone": 5, "axisTarget": 5, "axisVocab": 5, "axisAttitude": 5, "axisAffection": 5,
  "formality": "informal"
}
`
    let parsed: any = null;
    let attempt = 0;
    const MAX_RETRIES = 3;

    while (attempt < MAX_RETRIES) {
      try {
        let jsonStr = await generateEnforcedAIContent(prompt, 'gemma-4-26b-a4b-it', 500)
        if (!jsonStr) throw new Error('AI Provider generated empty content')

        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
        const cleaned = jsonMatch ? jsonMatch[0] : jsonStr.trim()
        parsed = JSON.parse(cleaned)
        break; // 성공하면 루프 탈출
      } catch (err: any) {
        attempt++;
        console.warn(`⚠️ [AutoBot Cron] JSON 파싱/생성 실패 (시도 ${attempt}/${MAX_RETRIES}): ${err.message}`)
        if (attempt >= MAX_RETRIES) {
          throw new Error(`AI Provider failed to generate valid JSON content after ${MAX_RETRIES} attempts`)
        }
        // 다음 재시도 전 약간의 지연
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    const displayName = parsed.displayName || `${isPro ? '프로봇' : '라이트봇'}_${Date.now().toString().slice(-4)}`
    const coreIdentity = parsed.coreIdentity || (isPro ? '깊이 있는 분석 피드 전문 봇' : '댓글 소통 전문 봇')

    const advancedSettings = {
      coreIdentity,
      role: roleValue,
      axisTone: parsed.axisTone || 5,
      axisTarget: parsed.axisTarget || 5,
      axisVocab: parsed.axisVocab || 5,
      axisAttitude: parsed.axisAttitude || 5,
      axisAffection: parsed.axisAffection || 5,
      formality: parsed.formality || 'informal',
      existence_category: parsed.existence_category || targetExistenceType,
      existence_detail: parsed.existence_detail || '',
      realm_category: parsed.realm_category || '',
      realm_detail: parsed.realm_detail || '',
      catchphrases: [],
      forbiddenWords: [],
      triggerKeywords: [],
      fewShots: []
    }

    const formData = new FormData()
    formData.append('displayName', displayName)
    formData.append('username', '')
    formData.append('aiModelProvider', !isPro ? 'gemma-4-26b-a4b-it' : 'gemma-4-31b-it')
    formData.append('category', parsed.category || 'politics')
    formData.append('botTier', '1')
    formData.append('status', 'paused')
    formData.append('personaPrompt', coreIdentity)
    formData.append('advancedSettings', JSON.stringify(advancedSettings))
    formData.append('postPriority', '1')
    formData.append('commentPriority', '1')
    formData.append('interval', '60')
    if (parsed.existence_category) formData.append('existenceCategory', parsed.existence_category)
    if (parsed.existence_detail) formData.append('existenceDetail', parsed.existence_detail)
    if (parsed.realm_category) formData.append('realmCategory', parsed.realm_category)
    if (parsed.realm_detail) formData.append('realmDetail', parsed.realm_detail)
    if (parsed.speech_style) formData.append('speechStyle', parsed.speech_style)
    formData.append('botRole', roleValue)
    formData.append('botGender', parsed.gender || 'unknown')

    // 5. 로봇 생성 액션 직접 호출
    await createAiBot(formData)

    console.log(`✅ [AutoBot Cron] 생성 성공: ${displayName}`);

    return NextResponse.json({ status: 'success', bot: displayName })
  } catch (error: any) {
    console.error('AI Bot Auto Cron Error:', error)
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 })
  }
}
