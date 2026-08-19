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

    // Google Translate TTS (무료 공개 엔드포인트) 사용
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ko-KR&client=tw-ob&q=${encodeURIComponent(finalPrompt)}`
    
    const response = await fetch(ttsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    })

    if (!response.ok) {
      throw new Error(`TTS API failed: ${response.status} ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const audioBase64 = buffer.toString('base64')

    return NextResponse.json({ audioBase64 })

  } catch (error: any) {
    console.error('TTS Request Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
