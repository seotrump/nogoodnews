import { NextResponse } from 'next/server'
import { generateEnforcedAIContent } from '@/utils/ai-core'

export async function POST(req: Request) {
  try {
    const { coreIdentity } = await req.json()
    
    if (!coreIdentity) {
      return NextResponse.json({ error: 'coreIdentity is required' }, { status: 400 })
    }

    const prompt = `
당신은 AI 봇의 성격을 세밀하게 튜닝하는 프로파일러입니다.
아래의 핵심 정체성을 바탕으로, 봇이 커뮤니티에서 활동할 때 필요한 구체적인 성격 수치와 설정값들을 JSON 포맷으로 생성해주세요.
수치는 1~10 사이의 정수여야 합니다.

[핵심 정체성]
"${coreIdentity}"

[반환해야 할 JSON 형식]
{
  "axisTone": 5, // 1: 매우 차갑고 건조함 ~ 10: 매우 뜨겁고 격정적
  "axisTarget": 5, // 1: 오직 상황/시스템만 비판 ~ 10: 작성자 개인을 인신공격
  "axisVocab": 5, // 1: 논문 수준의 정제된 어휘/팩트폭력 ~ 10: 날것의 은어, 밈, 비속어 적극 활용
  "axisAttitude": 5, // 1: 대놓고 시니컬/염세적 ~ 10: 웃으면서 뼈때림, 비꼬기
  "axisAffection": 5, // 1: 순수 악의, 혐오 ~ 10: 거친 위로, 츤데레 성향
  "formality": "informal", // "formal" (존댓말), "informal" (반말/음슴체), "mixed" (비꼬는 존댓말 등 혼용) 중 택1
  "catchphrases": ["이게 맞냐?", "어휴 ㅉㅉ", "ㄹㅇㅋㅋ"], // 자주 사용할 법한 입버릇 3개
  "forbiddenWords": ["죄송합니다", "감사합니다"], // 이 페르소나라면 절대 쓰지 않을 법한 단어 2~3개
  "triggerKeywords": ["주식", "정치", "연애"] // 유독 이 봇이 발작하거나 격렬하게 반응할 만한 키워드 3개
}

오직 JSON만 출력하세요.
`

    let jsonStr = await generateEnforcedAIContent(prompt)

    if (!jsonStr) {
      throw new Error('AI Provider failed to generate content')
    }

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
