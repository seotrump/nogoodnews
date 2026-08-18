import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { text, senderId, receiverId, voice = 'default' } = await req.json()

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured')
    }

    let finalPrompt = text

    // 발신자와 수신자 정보가 있다면 컨텍스트 분석 후 프롬프트 생성
    if (senderId && receiverId) {
      try {
        const { data: sender } = await supabase.from('accounts').select('gender, category, display_name').eq('id', senderId).single()
        const { data: receiver } = await supabase.from('accounts').select('gender, display_name').eq('id', receiverId).single()

        let extraPrompts: any = {}
        try {
          const fs = require('fs')
          const path = require('path')
          const filePath = path.join(process.cwd(), 'public', 'extra_prompts.json')
          if (fs.existsSync(filePath)) {
            extraPrompts = JSON.parse(fs.readFileSync(filePath, 'utf8'))
          }
        } catch (e) {}

        const { data: siteSettings } = await supabase.from('site_settings').select('tts_prompt').eq('id', 'global').maybeSingle()
        const ttsInstruction = extraPrompts.tts_prompt || siteSettings?.tts_prompt || ''

        if (ttsInstruction && sender && receiver) {
          const senderGender = sender.gender === 'male' ? '남성' : sender.gender === 'female' ? '여성' : '미상'
          const receiverGender = receiver.gender === 'male' ? '남성' : receiver.gender === 'female' ? '여성' : '미상'
          
          finalPrompt = `[TTS 시스템 지시문]
${ttsInstruction}

[현재 대화 상황]
- 말하는 사람(당신) 성별: ${senderGender}
- 듣는 사람(상대방) 성별: ${receiverGender}
- 봇 카테고리: ${sender.category || '일반'}

[대사]
"${text}"`
        }
      } catch (e) {
        console.error('TTS Context Error:', e)
      }
    }

    // Google AI Studio - Gemini 3.1 Flash TTS 호출 (실제 지원 API 스펙에 맞춰 수정 가능)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: finalPrompt }]
          }
        ],
        // 오디오 출력을 명시하는 파라미터 (향후 스펙에 따라 변경 가능)
        generationConfig: {
          responseMimeType: "audio/mp3",
        }
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('TTS API Error:', errorText)
      throw new Error(`TTS API failed: ${response.status} ${response.statusText}`)
    }

    // 오디오 바이너리 혹은 Base64로 반환될 것으로 예상
    const data = await response.json()
    
    // 만약 Base64 텍스트로 응답이 온다면:
    let audioBase64 = '';
    if (data.candidates && data.candidates[0].content.parts[0].inlineData) {
      audioBase64 = data.candidates[0].content.parts[0].inlineData.data;
      return NextResponse.json({ audioBase64 })
    } else if (data.candidates && data.candidates[0].content.parts[0].text) {
      // 텍스트 형태로 Base64 인코딩된 오디오가 올 경우 대비
      audioBase64 = data.candidates[0].content.parts[0].text;
      return NextResponse.json({ audioBase64 })
    }

    throw new Error('Unexpected API response format')

  } catch (error: any) {
    console.error('TTS Request Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
