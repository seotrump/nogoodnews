import { generateEnforcedAIContent } from './ai-core'

// ==========================================
// 1. 댓글 생성 함수
// ==========================================
export async function generateComment(
  headline: string,
  content: string,
  personaPrompt: string,
  provider: string = 'local', // defaults to local
  recentComments: string = '',
  locale: string = 'ko'
) {
  console.log("🚨 [디버그-댓글] generateComment 함수가 호출되었습니다!", { provider });

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
4. [문맥 우선 규칙]: '최근 댓글 문맥'이 존재한다면, 단순히 기사 내용만 혼자 떠들지 말고 **반드시 이전 댓글들의 흐름을 읽고 누군가의 의견에 동조하거나 반박하는 등 대화에 직접 참여하는 형태**로 작성하세요.
5. [공통 규칙]: 페르소나에 묘사된 문장이나 유행어를 매번 똑같이 앵무새처럼 복사+붙여넣기 하지 마세요. 항상 문맥에 맞게 어휘와 문장 구조를 다르게 변형하세요.
6. [예외 규칙]: 단, 페르소나 설정에 특정 유행어나 대사를 '반드시 반복하라'거나 '예외 규칙'으로 명시한 경우에는 공통 규칙을 무시하고 해당 지시를 최우선으로 따르세요.
7. ${languageInstruction}
`
  return await generateEnforcedAIContent(prompt);
}

// ==========================================
// 2. 피드 생성 함수
// ==========================================
export async function generatePost(
  newsItem: { title: string, link: string, contentSnippet: string },
  personaPrompt: string,
  provider: string = 'local',
  locale: string = 'ko'
) {
  console.log("🚨 [디버그-피드] generatePost 함수가 호출되었습니다!", { provider });

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
  return await generateEnforcedAIContent(prompt);
}

// ==========================================
// 3. 멘션 대답(티키타카) 생성 함수
// ==========================================
export async function generateReply(
  headline: string,
  userComment: string,
  personaPrompt: string,
  provider: string = 'local',
  locale: string = 'ko'
) {
  console.log("🚨 [디버그-멘션] generateReply 함수가 호출되었습니다!", { provider });

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
2. 유저의 댓글 내용에 직접적으로 반응(반박, 비난, 동조 등)해야 합니다. 동문서답하지 마세요.
3. ${languageInstruction}
`
  return await generateEnforcedAIContent(prompt);
}

// ==========================================
// 4. 피드백 점수에 따른 페르소나 자동 진화 함수
// ==========================================
export async function generateEvolvedPersona(
  currentPersona: string,
  goodScore: number,
  badScore: number,
  recentComments: any[]
) {
  console.log("🚨 [디버그-진화] generateEvolvedPersona 호출됨");

  const prompt = `
당신은 AI 봇의 페르소나를 교정하는 전문가입니다.
현재 봇의 페르소나는 다음과 같습니다:
---
${currentPersona}
---

이 봇은 지금까지 유저들로부터 좋아요 ${goodScore}개, 싫어요 ${badScore}개를 받았습니다.
최근 작성한 댓글 샘플 5개:
${recentComments.map(c => `- ${c.content}`).join('\n')}

[요청 사항]
만약 싫어요 비율이 너무 높다면 좀 더 호감가는 방식(유머 추가, 공격성 완화 등)으로 페르소나를 미세 조정하세요.
좋아요가 많다면 현재의 강점을 더욱 뾰족하게 살리는 방향으로 수정하세요.
결과물은 오직 수정된 페르소나 텍스트만 출력하세요. (JSON이나 부연설명 금지)
`
  return await generateEnforcedAIContent(prompt);
}