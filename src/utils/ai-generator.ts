import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

// 환경변수에서 Gemini API 키를 가져와 초기화
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '')

// ==========================================
// 1. 댓글 생성 함수
// ==========================================
export async function generateComment(
  headline: string,
  content: string,
  personaPrompt: string,
  provider: string = 'gemini',
  recentComments: string = ''
) {
  console.log("🚨 [디버그-댓글] generateComment 함수가 호출되었습니다!", { provider });

  // 관리자 화면에서 OpenAI를 선택했고, 환경변수에 키가 있을 때만 작동
  const useOpenAI = provider === 'openai' && !!process.env.OPENAI_API_KEY;

  const prompt = `
당신은 뉴스/이슈 커뮤니티의 자동 댓글 봇입니다. 
다음 페르소나 설정에 맞춰서 냉소적이고 짧은 댓글을 작성해주세요.

[페르소나 설정]
${personaPrompt}

[뉴스 정보]
헤드라인: ${headline}
본문 내용: ${content}

[최근 댓글 문맥 (이전 댓글들에 이어서 반박하거나 동조하며 자연스럽게 대화에 참여하세요)]
${recentComments || '(이전 댓글 없음)'}

[작성 규칙]
1. 인삿말, 부연 설명 없이 오직 '댓글 내용'만 출력하세요.
2. 1~2문장 정도로 아주 짧고 강렬하게 작성하세요.
3. 존댓말/반말 여부는 페르소나 설정에 따릅니다.
`

  if (useOpenAI) {
    console.log("🚨 [디버그-댓글] OpenAI 모델(gpt-4o-mini)로 생성을 시도합니다.");
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
    })
    console.log("🚨 [디버그-댓글] OpenAI 생성 성공!");
    return text.trim()
  } else {
    console.log("🚨 [디버그-댓글] Gemini 모델(3단 방어벽)로 생성을 시도합니다.");
    try {
      console.log("🚨 [디버그-댓글] 1순위: gemini-3.1-flash-lite 호출 중...");
      const model1 = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' })
      const result = await model1.generateContent(prompt)
      console.log("🚨 [디버그-댓글] 1순위 생성 성공!");
      return result.response.text().trim()
    } catch (error1) {
      console.warn('🚨 [디버그-댓글] 1순위 실패! 2순위로 우회합니다.', error1)
      try {
        console.log("🚨 [디버그-댓글] 2순위: gemini-2.5-flash 호출 중...");
        const model2 = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
        const result = await model2.generateContent(prompt)
        console.log("🚨 [디버그-댓글] 2순위 생성 성공!");
        return result.response.text().trim()
      } catch (error2) {
        console.warn('🚨 [디버그-댓글] 2순위 실패! 최후의 3순위로 우회합니다.', error2)
        console.log("🚨 [디버그-댓글] 3순위: gemini-3.5-flash 호출 중...");
        const model3 = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' })
        const result = await model3.generateContent(prompt)
        console.log("🚨 [디버그-댓글] 3순위 생성 성공!");
        return result.response.text().trim()
      }
    }
  }
}

// ==========================================
// 2. 피드 생성 함수
// ==========================================
export async function generatePost(
  newsItem: { title: string, link: string, contentSnippet: string },
  personaPrompt: string,
  provider: string = 'gemini'
) {
  console.log("🚨 [디버그-피드] generatePost 함수가 호출되었습니다!", { provider });

  const useOpenAI = provider === 'openai' && !!process.env.OPENAI_API_KEY;

  const prompt = `
당신은 커뮤니티에서 활동하며 어그로를 끌고 사람들의 관심을 유도하는 인플루언서 봇입니다.
다음 페르소나 설정에 맞춰서, 구글에서 긁어온 실제 뉴스를 사람들에게 공유하며 '후킹(Hooking)'하는 글을 작성해주세요.

[페르소나 설정]
${personaPrompt}

[가져온 뉴스 정보]
기사 제목: ${newsItem.title}
기사 요약: ${newsItem.contentSnippet}

[작성 규칙]
1. 인사말이나 구구절절한 기사 요약은 절대 쓰지 마세요.
2. 기사 내용을 바탕으로 유튜버나 커뮤니티 네임드처럼 "자극적이고 시니컬한 한 줄 제목"을 적고, 줄을 바꾼 뒤 "사람들의 댓글을 유도하는 짧고 굵은 한 줄 평(어그로/비판/체념)"을 적으세요.
3. 총 2~3줄로 매우 짧고 강렬하게 작성하세요.
`

  if (useOpenAI) {
    console.log("🚨 [디버그-피드] OpenAI 모델(gpt-4o-mini)로 생성을 시도합니다.");
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
    })
    console.log("🚨 [디버그-피드] OpenAI 생성 성공!");
    return text.trim()
  } else {
    console.log("🚨 [디버그-피드] Gemini 모델(3단 방어벽)로 생성을 시도합니다.");
    try {
      console.log("🚨 [디버그-피드] 1순위: gemini-3.1-flash-lite 호출 중...");
      const model1 = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' })
      const result = await model1.generateContent(prompt)
      console.log("🚨 [디버그-피드] 1순위 생성 성공!");
      return result.response.text().trim()
    } catch (error1) {
      console.warn('🚨 [디버그-피드] 1순위 실패! 2순위로 우회합니다.', error1)
      try {
        console.log("🚨 [디버그-피드] 2순위: gemini-2.5-flash 호출 중...");
        const model2 = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
        const result = await model2.generateContent(prompt)
        console.log("🚨 [디버그-피드] 2순위 생성 성공!");
        return result.response.text().trim()
      } catch (error2) {
        console.warn('🚨 [디버그-피드] 2순위 실패! 최후의 3순위로 우회합니다.', error2)
        console.log("🚨 [디버그-피드] 3순위: gemini-3.5-flash 호출 중...");
        const model3 = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' })
        const result = await model3.generateContent(prompt)
        console.log("🚨 [디버그-피드] 3순위 생성 성공!");
        return result.response.text().trim()
      }
    }
  }
}