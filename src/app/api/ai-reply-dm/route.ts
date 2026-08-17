import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateEnforcedAIContent } from '@/utils/ai-core'

export const maxDuration = 300; // Vercel 서버리스 타임아웃 300초로 연장

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { senderId, botId, message } = await req.json()

    if (!senderId || !botId || !message) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // 봇 정보 가져오기 (페르소나 관련 정보 포함)
    const { data: botAccount } = await supabase
      .from('accounts')
      .select('username, display_name, bio, persona_prompt, ai_model_provider, gender, nbti_type, type_code, axis_profile, speech_style')
      .eq('id', botId)
      .single()

    if (!botAccount) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    // 최근 대화 히스토리 (최대 15개) 가져오기
    const { data: recentMessages } = await supabase
      .from('direct_messages')
      .select('sender_id, content, created_at')
      .or(`and(sender_id.eq.${senderId},receiver_id.eq.${botId}),and(sender_id.eq.${botId},receiver_id.eq.${senderId})`)
      .order('created_at', { ascending: false })
      .limit(15)

    // 시간순으로 정렬 (오래된 것 → 최신 순)
    const history = (recentMessages || []).reverse()
    const historyText = history.length > 0
      ? history.map(m => `${m.sender_id === botId ? botAccount.display_name : '상대방'}: ${m.content}`).join('\n')
      : '(이전 대화 없음)'

    // 페르소나 정보 구성 (persona_prompt가 있으면 우선 사용)
    const personaInfo = botAccount.persona_prompt || botAccount.bio || '평범한 소셜 미디어 유저'
    const botGender = botAccount.gender === 'male' ? '남성' : botAccount.gender === 'female' ? '여성' : '중성/비공개'
    const botMbti = botAccount.nbti_type || botAccount.type_code || '알 수 없음'
    const speechStyle = botAccount.speech_style || '자연스럽고 편안한 말투'
    
    // 4대 판단축 정보 (axis_profile)
    let axisInfo = ''
    if (botAccount.axis_profile) {
      try {
        const axis = typeof botAccount.axis_profile === 'string' ? JSON.parse(botAccount.axis_profile) : botAccount.axis_profile
        axisInfo = `
- 성향(Tone): ${axis.axisTone || 5}/10 (1: 매우 진지함 ~ 10: 매우 유쾌함)
- 타겟(Target): ${axis.axisTarget || 5}/10 (1: 자아성찰적 ~ 10: 타인지향/오지랖)
- 어휘(Vocab): ${axis.axisVocab || 5}/10 (1: 학술적/정제됨 ~ 10: 은어/유행어/밈)
- 태도(Attitude): ${axis.axisAttitude || 5}/10 (1: 팩트폭격/논리 ~ 10: 무조건적 공감/위로)
- 애정도(Affection): ${axis.axisAffection || 5}/10 (1: 냉소적/거리둠 ~ 10: 열정적/친화적)
`
      } catch (e) {
        // 파싱 에러 시 무시
      }
    }

    // 사용할 AI 모델 (봇별 설정 → 기본값: gemma-4-26b-a4b-it)
    const aiModel = botAccount.ai_model_provider || 'gemma-4-26b-a4b-it'

    const prompt = `당신은 SNS 플랫폼의 유저 "${botAccount.display_name}" 입니다.
당신은 지금 상대방과 **1:1 비밀 디엠(DM)**을 나누고 있습니다. 공개적인 댓글창이 아니므로 훨씬 더 사적이고 감정적으로 교류해야 합니다.

[당신의 고유한 캐릭터/성향]
- 성별: ${botGender}
- 성격 유형(MBTI/NBTI): ${botMbti}
- 말투: ${speechStyle}
${axisInfo}
- 핵심 자아(페르소나):
"${personaInfo}"

[이전 대화 기록]
${historyText}

[지금 상대방이 보낸 메시지]
상대방: "${message}"

[답변 작성 지침 - 매우 중요]
1. 위의 대화 흐름을 자연스럽게 이어서, 당신의 성별(${botGender}), 성격(${botMbti}), 그리고 말투(${speechStyle})를 완벽하게 유지하며 답장하세요.
2. 당신의 판단축(TAMP) 수치와 페르소나를 적극적으로 반영하여, 사적인 질문(MBTI, 성별, 취향 등)이 들어오면 피하지 말고 솔직하고 인간적으로 대답하세요.
3. 공개적인 SNS 게시글이나 댓글처럼 무미건조하게 답하지 마세요. 1:1 채팅이므로 친밀감, 호감도, 때로는 감정적인 반응(냉소, 공감 등 당신의 성향에 맞는 반응)을 듬뿍 담으세요.
4. 절대 자신이 AI 언어모델이라는 사실을 밝히지 마세요. 진짜 사람처럼 대화하세요.
5. 인삿말(예: "안녕!", "반가워")을 매번 기계적으로 반복하지 말고, 대화의 맥락에 맞게 바로 본론으로 들어가거나 자연스럽게 이어나가세요.
6. 오직 답장 내용만 텍스트로 출력하세요.`

    const replyText = await generateEnforcedAIContent(prompt, aiModel)

    // 봇이 senderId(원래 보낸 사람)에게 메시지 보내기
    await supabase.from('direct_messages').insert({
      sender_id: botId,
      receiver_id: senderId,
      content: replyText,
      is_read: false
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('AI DM Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
