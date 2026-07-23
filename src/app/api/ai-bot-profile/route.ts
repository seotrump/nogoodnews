import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '')

export async function POST(req: Request) {
  try {
    const { coreIdentity } = await req.json()
    if (!coreIdentity) {
      return NextResponse.json({ error: 'coreIdentity is required' }, { status: 400 })
    }

    const prompt = `
당신은 커뮤니티 봇 페르소나 설정 전문가입니다.
사용자가 입력한 다음 '핵심 정체성(core identity)'을 바탕으로 가장 적절한 성격, 말투, 어휘, 카테고리 등을 JSON 형식으로만 반환하세요.
부연 설명이나 마크다운 백틱(\`\`\`)을 사용하지 말고 오직 유효한 JSON 문자열만 출력하세요.

[핵심 정체성]
"${coreIdentity}"

[반환해야 할 JSON 형식]
{
  "category": "politics" | "economy" | "work" | "entertainment" | "tech", // 가장 어울리는 분야 1개
  "axisTone": number, // 1(차갑고 건조함) ~ 10(뜨겁고 격정적)
  "axisTarget": number, // 1(상황/시스템) ~ 10(작성자 본인)
  "axisVocab": number, // 1(정제된 팩트폭력) ~ 10(날것의 은어/밈)
  "axisAttitude": number, // 1(대놓고 시니컬) ~ 10(웃으면서 뼈때림)
  "axisAffection": number, // 1(순수 비난) ~ 10(거친 위로 츤데레)
  "formality": "informal" | "formal" | "sarcastic",
  "catchphrases": ["자주 쓸법한 입버릇 1", "자주 쓸법한 입버릇 2"], // 1~3개
  "forbiddenWords": ["절대 쓰지 않을 단어 1"], // 0~2개
  "triggerKeywords": ["반응할 키워드 1", "반응할 키워드 2", "반응할 키워드 3"] // 3~5개
}
`

    let jsonStr = ''

    // OpenAI 키가 있으면 우선 시도, 없거나 에러나면 Gemini
    if (process.env.OPENAI_API_KEY) {
      try {
        const { text } = await generateText({
          model: openai('gpt-4o-mini'),
          prompt,
        })
        jsonStr = text.trim()
      } catch (e) {
        console.warn('OpenAI 실패, Gemini로 전환', e)
      }
    }

    if (!jsonStr) {
      try {
        const { text } = await generateText({
          model: openai('base-gemma-4-26b'),
          prompt,
        })
        jsonStr = text.trim()
      } catch (e1) {
        try {
          const { text } = await generateText({
            model: openai('gemma-4-31b'),
            prompt,
          })
          jsonStr = text.trim()
        } catch (e2) {
          if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            const model3 = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' })
            const result = await model3.generateContent(prompt)
            jsonStr = result.response.text().trim()
          }
        }
      }
    }

    if (!jsonStr) {
      throw new Error('AI Provider failed to generate content')
    }

    // JSON 문자열 다듬기 (간혹 백틱이 들어올 경우 대비)
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '')
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '')
    }

    const parsed = JSON.parse(jsonStr)
    return NextResponse.json(parsed)
  } catch (error: any) {
    console.error('AI Profile Generation Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
