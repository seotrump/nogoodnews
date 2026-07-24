import { GoogleGenerativeAI } from '@google/generative-ai'

export async function generateEnforcedAIContent(prompt: string): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is missing');
  }
  const genAI = new GoogleGenerativeAI(apiKey);

  console.log("🚨 [Central AI Core] 1순위: Google API (base-gemma-4-26b) 호출 시도...");
  try {
    const model1 = genAI.getGenerativeModel({ model: 'base-gemma-4-26b' })
    const result = await model1.generateContent(prompt)
    console.log("🚨 [Central AI Core] 1순위 생성 성공!");
    return result.response.text().trim()
  } catch (error1) {
    console.warn('🚨 [Central AI Core] 1순위 실패! 2순위로 우회합니다.', error1)
    
    try {
      console.log("🚨 [Central AI Core] 2순위: Google API (gemma-4-31b) 호출 시도...");
      const model2 = genAI.getGenerativeModel({ model: 'gemma-4-31b' })
      const result = await model2.generateContent(prompt)
      console.log("🚨 [Central AI Core] 2순위 생성 성공!");
      return result.response.text().trim()
    } catch (error2) {
      console.warn('🚨 [Central AI Core] 2순위 실패! 최후의 3순위로 우회합니다.', error2)
      
      console.log("🚨 [Central AI Core] 3순위: Google API (gemini-3.1-flash-lite) 호출 시도...");
      try {
        const model3 = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' })
        const result = await model3.generateContent(prompt)
        console.log("🚨 [Central AI Core] 3순위 생성 성공!");
        return result.response.text().trim()
      } catch (error3) {
        console.error('🚨 [Central AI Core] 모든 AI 모델 호출 실패!', error3)
        throw new Error('All configured AI models failed to generate content.');
      }
    }
  }
}
