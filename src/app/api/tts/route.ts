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

    // 1. 마크다운, 특수기호, URL, HTML 태그 정제 (읽기 편하게)
    let cleanText = text
      .replace(/https?:\/\/[^\s]+/g, '') // URL 제거
      .replace(/<[^>]*>?/gm, '') // HTML 제거
      .replace(/[*_#\[\]()`~>]/g, '') // 마크다운 기호 제거
      .replace(/\n/g, ' ') // 줄바꿈 제거
      .trim();

    if (!cleanText) {
      return NextResponse.json({ error: 'No readable text' }, { status: 400 })
    }

    let finalPrompt = cleanText

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
          
          finalPrompt = `[지시사항]
다음 대사를 자연스러운 사람의 목소리로 연기하듯 읽어주세요.
- 화자 성별: ${senderGender}
- 청자 성별: ${receiverGender}
- 화자 카테고리: ${sender.category || '일반'}

대사: "${cleanText}"`
        }
      } catch (e) {
        console.error('TTS Context Error:', e)
      }
    }

    let audioBase64 = null;

    // 2. Gemini 3.1 Flash TTS 우선 시도
    try {
      console.log('Attempting Gemini 3.1 Flash TTS...');
      // 가상의 Gemini TTS 오디오 생성 API 엔드포인트 형태
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts:generateContent?key=${apiKey}`
      
      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
          generationConfig: {
            responseModalities: ["AUDIO"]
          }
        })
      });
      
      if (geminiRes.ok) {
        const data = await geminiRes.json();
        // Base64 오디오 데이터 추출
        if (data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
          audioBase64 = data.candidates[0].content.parts[0].inlineData.data;
          console.log('✅ Successfully generated audio with Gemini 3.1 Flash TTS');
        }
      } else {
        console.warn(`⚠️ Gemini TTS API Error (Quota or Model not found): ${geminiRes.status}`);
      }
    } catch (e) {
      console.warn('⚠️ Gemini 3.1 Flash TTS fetch failed:', e);
    }

    // 3. Gemini TTS 실패 시 Google Translate 기본 모델로 Fallback (안전장치)
    if (!audioBase64) {
      console.log('🔄 Falling back to basic Google Translate TTS...');
      // 번역기 TTS에는 프롬프트 없이 순수 텍스트(cleanText)만 전달해야 함
      // (프롬프트를 넣으면 "[지시사항]..." 까지 전부 로봇이 읽어버림)
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ko-KR&client=tw-ob&q=${encodeURIComponent(cleanText)}`
      
      const response = await fetch(ttsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      })

      if (!response.ok) {
        throw new Error(`Fallback TTS API failed: ${response.status} ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      audioBase64 = buffer.toString('base64')
    }

    return NextResponse.json({ audioBase64 })

  } catch (error: any) {
    console.error('TTS Request Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
