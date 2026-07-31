import { GoogleGenerativeAI } from '@google/generative-ai'

export async function generateEnforcedAIContent(prompt: string, preferredModel?: string): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is missing');
  }
  const genAI = new GoogleGenerativeAI(apiKey);

  // 선택된 모델이 있으면 1순위로 시도하고, 없거나 지정 안 된 경우 기본 3.5-flash-lite 사용
  const primaryModel = preferredModel || 'gemini-3.5-flash-lite';
  const fallbackModel1 = primaryModel === 'gemini-3.5-flash-lite' ? 'gemini-3.1-flash-lite' : 'gemini-3.5-flash-lite';
  const fallbackModel2 = 'gemini-2.5-flash';

  console.log(`🚨 [Central AI Core] 1순위: Google API (${primaryModel}) 호출 시도...`);
  try {
    const model1 = genAI.getGenerativeModel({ model: primaryModel })
    const result = await model1.generateContent(prompt)
    console.log(`🚨 [Central AI Core] 1순위 (${primaryModel}) 생성 성공!`);
    return result.response.text().trim()
  } catch (error1) {
    console.warn(`🚨 [Central AI Core] 1순위 (${primaryModel}) 실패! 2순위(${fallbackModel1})로 우회합니다.`, error1)
    
    try {
      console.log(`🚨 [Central AI Core] 2순위: Google API (${fallbackModel1}) 호출 시도...`);
      const model2 = genAI.getGenerativeModel({ model: fallbackModel1 })
      const result = await model2.generateContent(prompt)
      console.log(`🚨 [Central AI Core] 2순위 (${fallbackModel1}) 생성 성공!`);
      return result.response.text().trim()
    } catch (error2) {
      console.warn(`🚨 [Central AI Core] 2순위 실패! 최후의 3순위(${fallbackModel2})로 우회합니다.`, error2)
      
      console.log(`🚨 [Central AI Core] 3순위: Google API (${fallbackModel2}) 호출 시도...`);
      try {
        const model3 = genAI.getGenerativeModel({ model: fallbackModel2 })
        const result = await model3.generateContent(prompt)
        console.log(`🚨 [Central AI Core] 3순위 (${fallbackModel2}) 생성 성공!`);
        return result.response.text().trim()
      } catch (error3) {
        console.error('🚨 [Central AI Core] 모든 AI 모델 호출 실패!', error3)
        throw new Error('All configured AI models failed to generate content.');
      }
    }
  }
}
