import { NextResponse } from 'next/server'
import { generateEnforcedAIContent } from '@/utils/ai-core'

export async function POST(req: Request) {
  try {
    const { keyword } = await req.json()
    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 })
    }

    const prompt = `당신은 대한민국 최고의 SEO 마케팅 및 블로그 기획 전문가입니다.
사용자가 입력한 타겟 키워드: "${keyword}"

이 키워드를 바탕으로 다음 두 가지를 제안해주세요:
1. 연관 SEO 키워드 (검색량이 많고, 본문에 자연스럽게 녹이기 좋은 단어) 5개
2. 클릭을 유도하는 매력적인(어그로/후킹) 블로그 포스팅 제목 5개

결과는 반드시 아래 JSON 형식으로만 응답하세요 (다른 설명은 일절 포함하지 마세요):
{
  "keywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"],
  "titles": ["제목1", "제목2", "제목3", "제목4", "제목5"]
}
`
    const responseText = await generateEnforcedAIContent(prompt, 'gemma-4-31b-it')
    
    // Extract JSON block if surrounded by markdown
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || responseText.match(/{[\s\S]*}/)
    let jsonResult = { keywords: [], titles: [] }
    
    if (jsonMatch) {
      try {
        const jsonStr = jsonMatch[1] || jsonMatch[0]
        jsonResult = JSON.parse(jsonStr)
      } catch (e) {
        console.error('Failed to parse AI suggestion JSON:', e, responseText)
      }
    } else {
      try {
        jsonResult = JSON.parse(responseText)
      } catch (e) {
        console.error('Failed to parse AI suggestion JSON (raw):', e, responseText)
      }
    }

    return NextResponse.json(jsonResult)
  } catch (error: any) {
    console.error('Error in ai-blog-suggest API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
