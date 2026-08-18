import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { text, voice = 'default' } = await req.json()

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured')
    }

    // Google AI Studio - Gemini 3.1 Flash TTS 호출 (실제 지원 API 스펙에 맞춰 수정 가능)
    // 현재 공식적으로 문서화된 엔드포인트 구조를 추정하여 작성
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text }]
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
