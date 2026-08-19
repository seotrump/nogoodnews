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

    // 1. 마크다운, 특수기호, URL, HTML 태그 정제 (감정 태그 [whispers] 등은 살리기 위해 대괄호 제외)
    let cleanText = text
      .replace(/https?:\/\/[^\s]+/g, '') // URL 제거
      .replace(/<[^>]*>?/gm, '') // HTML 제거
      .replace(/[*_#()`~>]/g, '') // 마크다운 기호 제거 (대괄호 제외)
      .replace(/\n/g, ' ') // 줄바꿈 제거
      .trim();

    if (!cleanText) {
      return NextResponse.json({ error: 'No readable text' }, { status: 400 })
    }

    let finalPrompt = cleanText

    // 발신자와 수신자 정보, DB에서 voiceName 조회
    let voiceName = 'Zephyr' // 기본 목소리
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

        // DB에서 관리자가 설정한 목소리 이름 조회
        if (extraPrompts.tts_voice_name) {
          voiceName = extraPrompts.tts_voice_name
        } else if (sender?.gender === 'female') {
          // 여성 봇 → 여성 목소리 (Zephyr), 남성 봇 → 남성 목소리 (Puck)
          voiceName = 'Zephyr'
        } else if (sender?.gender === 'male') {
          voiceName = 'Puck'
        }

        const { data: siteSettings } = await supabase.from('site_settings').select('tts_prompt').eq('id', 'global').maybeSingle()
        const ttsInstruction = extraPrompts.tts_prompt || siteSettings?.tts_prompt || ''

        if (sender) {
          const senderGender = sender.gender === 'male' ? '남성' : sender.gender === 'female' ? '여성' : '미상'
          const receiverGender = receiver?.gender === 'male' ? '남성' : receiver?.gender === 'female' ? '여성' : '미상'

          if (ttsInstruction) {
            finalPrompt = `[지시사항]\n${ttsInstruction}\n- 화자 성별: ${senderGender}\n- 청자 성별: ${receiverGender}\n- 화자 카테고리: ${sender.category || '일반'}\n\n대사: "${cleanText}"`
          }
        }
      } catch (e) {
        console.error('TTS Context Error:', e)
      }
    }

    let audioBase64 = null;
    let audioMimeType = 'audio/mp3';

    // 2-A. gemini-2.5-flash-preview-tts (500 쿼터 모델) - 순수 텍스트만 전달 필수
    //      이 모델은 system_instruction이나 한국어 지시문이 포함되면
    //      텍스트 생성을 시도해서 400 에러가 발생하므로 cleanText만 사용
    try {
      console.log(`[TTS] 1차 시도: gemini-2.5-flash-preview-tts (voice: ${voiceName})`);
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`

      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: cleanText }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceName === 'auto' ? 'Zephyr' : voiceName }
              }
            }
          }
        })
      });

      if (geminiRes.ok) {
        const data = await geminiRes.json();
        const part = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (part?.data) {
          const pcmMimeType: string = part.mimeType || '';
          const pcmBuffer = Buffer.from(part.data, 'base64');
          const sampleRate = parseInt(pcmMimeType.match(/rate=(\d+)/)?.[1] || '24000');
          const channels = parseInt(pcmMimeType.match(/channels=(\d+)/)?.[1] || '1');
          const wavBuffer = buildWavBuffer(pcmBuffer, sampleRate, channels, 16);
          audioBase64 = wavBuffer.toString('base64');
          audioMimeType = 'audio/wav';
          console.log(`✅ [TTS] gemini-2.5-flash-preview-tts 성공 (${voiceName})`);
        }
      } else {
        const errBody = await geminiRes.text();
        console.warn(`⚠️ [TTS] gemini-2.5-flash-preview-tts 실패 ${geminiRes.status}: ${errBody.substring(0, 200)}`);
      }
    } catch (e) {
      console.warn('⚠️ [TTS] gemini-2.5-flash-preview-tts 예외:', e);
    }

    // 2-B. 1차 실패 시 gemini-3.1-flash-tts-preview 로 2차 시도 (RPD 10 한도이나 긴급 백업)
    if (!audioBase64) {
      try {
        console.log(`[TTS] 2차 시도: gemini-3.1-flash-tts-preview (voice: ${voiceName})`);
        const geminiUrl2 = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${apiKey}`
        const geminiRes2 = await fetch(geminiUrl2, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voiceName === 'auto' ? 'Zephyr' : voiceName }
                }
              }
            }
          })
        });
        if (geminiRes2.ok) {
          const data2 = await geminiRes2.json();
          const part2 = data2.candidates?.[0]?.content?.parts?.[0]?.inlineData;
          if (part2?.data) {
            const pcmMimeType = part2.mimeType || '';
            const pcmBuffer = Buffer.from(part2.data, 'base64');
            const sampleRate = parseInt(pcmMimeType.match(/rate=(\d+)/)?.[1] || '24000');
            const channels = parseInt(pcmMimeType.match(/channels=(\d+)/)?.[1] || '1');
            audioBase64 = buildWavBuffer(pcmBuffer, sampleRate, channels, 16).toString('base64');
            audioMimeType = 'audio/wav';
            console.log(`✅ [TTS] gemini-3.1-flash-tts-preview 성공`);
          }
        } else {
          console.warn(`⚠️ [TTS] gemini-3.1-flash-tts-preview 실패 ${geminiRes2.status}`);
        }
      } catch (e) {
        console.warn('⚠️ [TTS] gemini-3.1-flash-tts-preview 예외:', e);
      }
    }

    // 3. Gemini TTS 실패 시 Google Translate TTS Fallback
    if (!audioBase64) {
      console.log('🔄 Falling back to Google Translate TTS...');
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ko-KR&client=tw-ob&q=${encodeURIComponent(cleanText)}`

      const response = await fetch(ttsUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      })

      if (!response.ok) {
        throw new Error(`Fallback TTS API failed: ${response.status} ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      audioBase64 = Buffer.from(arrayBuffer).toString('base64')
      audioMimeType = 'audio/mp3'
    }

    return NextResponse.json({ audioBase64, mimeType: audioMimeType })

  } catch (error: any) {
    console.error('TTS Request Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
