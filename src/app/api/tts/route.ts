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
    const selectedVoice = (voiceName === 'auto' || !voiceName) ? 'Zephyr' : voiceName;
    const ttsModelUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${apiKey}`;

    // 2-A. 1순위: gemini-3.1-flash-tts-preview + tools.googleSearch
    //      → '맵 그라운딩' 카테고리 쿼터 소모 (RPD 500회)
    try {
      console.log(`[TTS] 1차: 맵 그라운딩(500/일) voice=${selectedVoice}`);
      const res1 = await fetch(ttsModelUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: cleanText }] }],
          tools: [{ googleSearch: {} }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } }
          }
        })
      });
      if (res1.ok) {
        const d1 = await res1.json();
        const p1 = d1.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData;
        if (p1?.data) {
          const pcm = Buffer.from(p1.data, 'base64');
          const sr = parseInt(p1.mimeType?.match(/rate=(\d+)/)?.[1] || '24000');
          const ch = parseInt(p1.mimeType?.match(/channels=(\d+)/)?.[1] || '1');
          audioBase64 = buildWavBuffer(pcm, sr, ch, 16).toString('base64');
          audioMimeType = 'audio/wav';
          console.log(`✅ [TTS] 맵 그라운딩 성공 (voice: ${selectedVoice})`);
        }
      } else {
        console.warn(`⚠️ [TTS] 맵 그라운딩 실패 ${res1.status}: ${(await res1.text()).substring(0, 150)}`);
      }
    } catch (e) {
      console.warn('⚠️ [TTS] 맵 그라운딩 예외:', e);
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

// L16 PCM 데이터를 WAV 포맷으로 변환 (브라우저 <audio> 재생용)
function buildWavBuffer(pcmData: Buffer, sampleRate: number, channels: number, bitsPerSample: number): Buffer {
  const byteRate = sampleRate * channels * (bitsPerSample / 8)
  const blockAlign = channels * (bitsPerSample / 8)
  const dataSize = pcmData.length
  const header = Buffer.alloc(44)

  header.write('RIFF', 0)
  header.writeUInt32LE(36 + dataSize, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)           // PCM chunk size
  header.writeUInt16LE(1, 20)            // PCM format
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(bitsPerSample, 34)
  header.write('data', 36)
  header.writeUInt32LE(dataSize, 40)

  return Buffer.concat([header, pcmData])
}
