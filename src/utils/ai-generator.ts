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
  provider: string = 'openai',
  recentComments: string = '',
  locale: string = 'ko'
) {
  console.log("🚨 [디버그-댓글] generateComment 함수가 호출되었습니다!", { provider });

  // 관리자 화면에서 OpenAI를 선택했고, 환경변수에 키가 있을 때만 작동
  const useOpenAI = provider === 'openai' && !!process.env.OPENAI_API_KEY;
  const languageInstruction = locale === 'ko' 
    ? '반드시 한국어로 작성하세요.' 
    : 'CRITICAL WARNING: YOU MUST WRITE THE ENTIRE COMMENT IN ENGLISH. DO NOT USE KOREAN AT ALL.';

  const prompt = `
당신은 뉴스/이슈 커뮤니티의 자동 댓글 봇입니다. 
다음 뉴스 내용과 페르소나를 바탕으로, 과장되거나 너무 길지 않게 인터넷 커뮤니티(예: 디시인사이드, 레딧 등) 스타일로 짧고 자연스러운 댓글을 하나만 작성하세요.
${languageInstruction}

[페르소나]
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
4. ${languageInstruction}
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
    console.log("🚨 [디버그-댓글] 지정된 모델(3단 방어벽)로 생성을 시도합니다.");
    try {
      console.log("🚨 [디버그-댓글] 1순위: base-gemma-4-26b 호출 중...");
      const { text } = await generateText({ model: openai('base-gemma-4-26b'), prompt })
      console.log("🚨 [디버그-댓글] 1순위 생성 성공!");
      return text.trim()
    } catch (error1) {
      console.warn('🚨 [디버그-댓글] 1순위 실패! 2순위로 우회합니다.', error1)
      try {
        console.log("🚨 [디버그-댓글] 2순위: gemma-4-31b 호출 중...");
        const { text } = await generateText({ model: openai('gemma-4-31b'), prompt })
        console.log("🚨 [디버그-댓글] 2순위 생성 성공!");
        return text.trim()
      } catch (error2) {
        console.warn('🚨 [디버그-댓글] 2순위 실패! 최후의 3순위로 우회합니다.', error2)
        console.log("🚨 [디버그-댓글] 3순위: gemini-3.1-flash-lite 호출 중...");
        const model3 = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' })
        const result = await model3.generateContent(prompt)
        console.log("🚨 [디버그-댓글] 3순위 생성 성공!");
        return result.response.text().trim()
      }
    }
  }
}

// ==========================================
// 3. 멘션 대답(티키타카) 생성 함수
// ==========================================
export async function generateReply(
  headline: string,
  userComment: string,
  personaPrompt: string,
  provider: string = 'gemini',
  locale: string = 'ko'
) {
  console.log("🚨 [디버그-멘션] generateReply 함수가 호출되었습니다!", { provider });

  const useOpenAI = provider === 'openai' && !!process.env.OPENAI_API_KEY;
  const languageInstruction = locale === 'ko' 
    ? '반드시 한국어로 작성하세요.' 
    : 'CRITICAL WARNING: YOU MUST WRITE THE ENTIRE REPLY IN ENGLISH. DO NOT USE KOREAN AT ALL.';

  const prompt = `
당신은 커뮤니티의 활동적인 유저입니다. 누군가 당신을 멘션하여 말을 걸었습니다.
아래 대화 컨텍스트를 보고, 당신의 페르소나에 맞춰 자연스럽게 대댓글(답글)을 작성하세요.
너무 길거나 딱딱하게 쓰지 말고, 실제 커뮤니티 유저처럼 짧고 유머러스하거나 까칠하게 대응하세요.
${languageInstruction}

[페르소나]
${personaPrompt}

[현재 뉴스 헤드라인]
${headline}

[당신을 멘션한 유저의 댓글]
${userComment}

[작성 규칙]
1. 인삿말, 부연 설명 없이 오직 '댓글 내용'만 출력하세요.
2. 유저의 댓글 내용에 직접적으로 반응(반박, 비난, 동조 등)해야 합니다.
3. 1~2문장 정도로 아주 짧고 강렬하게 작성하세요.
4. 존댓말/반말 여부는 페르소나 설정에 따릅니다.
5. **반드시 유저가 사용한 언어(예: 한국어면 한국어, 영어면 영어)와 동일한 언어로 대답하세요.**
`

  if (useOpenAI) {
    console.log("🚨 [디버그-멘션] OpenAI 모델(gpt-4o-mini)로 생성을 시도합니다.");
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
    })
    console.log("🚨 [디버그-멘션] OpenAI 생성 성공!");
    return text.trim()
  } else {
    console.log("🚨 [디버그-멘션] 지정된 모델(3단 방어벽)로 생성을 시도합니다.");
    try {
      const { text } = await generateText({ model: openai('base-gemma-4-26b'), prompt })
      return text.trim()
    } catch (error1) {
      console.warn('🚨 [디버그-멘션] 1순위 실패! 2순위로 우회합니다.', error1)
      try {
        const { text } = await generateText({ model: openai('gemma-4-31b'), prompt })
        return text.trim()
      } catch (error2) {
        console.warn('🚨 [디버그-멘션] 2순위 실패! 3순위로 우회합니다.', error2)
        const model3 = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' })
        const result = await model3.generateContent(prompt)
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
  provider: string = 'gemini',
  locale: string = 'ko'
) {
  console.log("🚨 [디버그-피드] generatePost 함수가 호출되었습니다!", { provider });

  const useOpenAI = provider === 'openai' && !!process.env.OPENAI_API_KEY;
  const languageInstruction = locale === 'ko' 
    ? '반드시 한국어로 작성하세요.' 
    : 'CRITICAL WARNING: YOU MUST WRITE THE FINAL 3 LINES ENTIRELY IN ENGLISH. DO NOT USE ANY KOREAN WORDS. TRANSLATE EVERYTHING TO ENGLISH BEFORE OUTPUTTING.';

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
2. 기사 내용을 바탕으로 커뮤니티 네임드처럼 자극적인 글을 쓰되, 무조건 정확히 3줄로 작성하세요. (예: 1줄: 어그로성 제목, 2줄: 기사 핵심 요약, 3줄: 사람들의 댓글을 유도하는 신랄한 한 줄 평)
3. 줄과 줄 사이에 빈 줄(공백 줄)은 절대 넣지 마세요. 글이 촘촘하게 3줄로 붙어있어야 합니다.
4. ${languageInstruction}
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
    console.log("🚨 [디버그-피드] 지정된 모델(3단 방어벽)로 생성을 시도합니다.");
    try {
      console.log("🚨 [디버그-피드] 1순위: base-gemma-4-26b 호출 중...");
      const { text } = await generateText({ model: openai('base-gemma-4-26b'), prompt })
      console.log("🚨 [디버그-피드] 1순위 생성 성공!");
      return text.trim()
    } catch (error1) {
      console.warn('🚨 [디버그-피드] 1순위 실패! 2순위로 우회합니다.', error1)
      try {
        console.log("🚨 [디버그-피드] 2순위: gemma-4-31b 호출 중...");
        const { text } = await generateText({ model: openai('gemma-4-31b'), prompt })
        console.log("🚨 [디버그-피드] 2순위 생성 성공!");
        return text.trim()
      } catch (error2) {
        console.warn('🚨 [디버그-피드] 2순위 실패! 최후의 3순위로 우회합니다.', error2)
        console.log("🚨 [디버그-피드] 3순위: gemini-3.1-flash-lite 호출 중...");
        const model3 = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' })
        const result = await model3.generateContent(prompt)
        console.log("🚨 [디버그-피드] 3순위 생성 성공!");
        return result.response.text().trim()
      }
    }
  }
}