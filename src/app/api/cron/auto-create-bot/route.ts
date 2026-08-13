import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateEnforcedAIContent } from '@/utils/ai-core'
import { createAiBot } from '@/app/[locale]/admin/actions'

export const maxDuration = 60; // 60초 타임아웃 제한
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. 설정 확인
    const { data: siteSettings } = await supabaseAdmin
      .from('site_settings')
      .select('is_auto_bot_active, auto_bot_target_count, auto_bot_prompt')
      .eq('id', 'global')
      .single()

    if (!siteSettings?.is_auto_bot_active) {
      return NextResponse.json({ status: 'skipped', reason: 'Auto bot creation is disabled in settings.' })
    }

    // 2. 대기 중인 오토봇 개수 확인 로직 (제한용이 아니라 로그용으로만 유지)
    const { count, error: countError } = await supabaseAdmin
      .from('accounts')
      .select('*', { count: 'exact', head: true })
      .eq('is_ai', true)
      .eq('status', 'paused')

    if (countError) throw countError

    // 제한 해제: count >= targetCount 체크 삭제


    // 3. 봇 종류 선택 (50% 확률로 Lite, 50% 확률로 Pro)
    const isPro = Math.random() < 0.5;
    const botType = isPro ? 'pro' : 'lite';

    console.log(`🤖 [AutoBot Cron] 시작... 타입: ${botType}, 현재 대기 수: ${count} (제한 없음)`);

    // 4. 기존 봇 이름 목록 (중복 방지)
    const { data: existingBots } = await supabaseAdmin
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

    const customAutoBotPrompt = (siteSettings.auto_bot_prompt || '당신은 독창적인 커뮤니티 유저(AI 봇) 페르소나 통합 기획자입니다.')
      .replace('{기존 이름 목록 자동 삽입}', existingListStr);

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

[반환해야 할 JSON 형식 - 중요: 절대로 당신의 생각, 분석, 마크다운 코드블록 밖의 어떤 텍스트도 출력하지 마세요. 처음부터 끝까지 오직 { 로 시작해서 } 로 끝나는 유효한 JSON 객체 1개만 출력하세요!]
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
    const MAX_RETRIES = 1; // Vercel 60초 타임아웃 방지를 위해 1회 실패 시 즉시 폴백(Fallback) 봇 생성

    while (attempt < MAX_RETRIES) {
      try {
        let jsonStr = await generateEnforcedAIContent(prompt, 'gemma-4-26b-a4b-it')
        if (!jsonStr) throw new Error('AI Provider generated empty content')

        // 1. 코드블록 마크다운에서 추출 시도
        const blockMatch = jsonStr.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i)
        let cleaned = ''
        if (blockMatch) {
          cleaned = blockMatch[1]
        } else {
          // 2. 마크다운이 없으면 가장 바깥쪽 {...} 추출
          const firstBrace = jsonStr.indexOf('{')
          const lastBrace = jsonStr.lastIndexOf('}')
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            cleaned = jsonStr.substring(firstBrace, lastBrace + 1)
          } else {
            cleaned = jsonStr
          }
        }

        // 트레일링 콤마 제거
        cleaned = cleaned.replace(/,\s*([\}\]])/g, '$1')

        try {
          parsed = JSON.parse(cleaned)
        } catch (parseErr) {
          console.warn('--- FAILED TO PARSE JSON ---');
          console.warn('RAW jsonStr:', jsonStr);
          console.warn('CLEANED string:', cleaned);
          // Regex 방어적 키 추출 (최후의 수단)
          const nameMatch = cleaned.match(/"displayName"\s*:\s*"([^"]+)"/) || jsonStr.match(/"displayName"\s*:\s*"([^"]+)"/)
          const identityMatch = cleaned.match(/"coreIdentity"\s*:\s*"([^"]+)"/) || jsonStr.match(/"coreIdentity"\s*:\s*"([^"]+)"/)
          if (nameMatch || identityMatch) {
            parsed = {
              displayName: nameMatch ? nameMatch[1] : undefined,
              coreIdentity: identityMatch ? identityMatch[1] : undefined
            }
          } else {
            throw parseErr
          }
        }
        break; // 성공하면 루프 탈출
      } catch (err: any) {
        attempt++;
        console.warn(`⚠️ [AutoBot Cron] JSON 파싱/생성 실패 (시도 ${attempt}/${MAX_RETRIES}): ${err.message}`)
        if (attempt >= MAX_RETRIES) {
          console.warn(`⚠️ [AutoBot Cron] 파싱 실패로 기본 폴백 봇 객체를 생성합니다.`)
          parsed = {
            displayName: `오토본_${Date.now().toString().slice(-4)}-Autobon`,
            coreIdentity: isPro ? '깊이 있는 분석 피드 전문 봇' : '댓글 소통 전문 봇',
            category: targetCategory,
            existence_category: targetExistenceType,
            gender: targetGender
          }
        } else {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
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
