import { GoogleGenerativeAI } from '@google/generative-ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'

// ── Gemma 모델 여부 판별 ──────────────────────────────────────
function isGemmaModel(model: string): boolean {
  return model.toLowerCase().startsWith('gemma')
}

// ── @ai-sdk/google 경로: Gemma 계열 전용 ────────────────────
async function generateWithAiSdkGoogle(prompt: string, modelId: string, maxOutputTokens?: number): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is missing')

  const googleProvider = createGoogleGenerativeAI({ apiKey })

  console.log(`🚀 [AI Core / ai-sdk] Gemma 경로 (${modelId}) 호출 시도...`)
  const { text } = await generateText({
    model: googleProvider(modelId),
    prompt,
    maxOutputTokens: maxOutputTokens,
  })
  console.log(`✅ [AI Core / ai-sdk] (${modelId}) 생성 성공! (maxTokens: ${maxOutputTokens || 'auto'})`)
  return text.trim()
}

// ── @google/generative-ai 경로: Gemini 계열 전용 ────────────
async function generateWithLegacySdk(prompt: string, modelId: string, maxOutputTokens?: number): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is missing')

  const genAI = new GoogleGenerativeAI(apiKey)
  console.log(`🚀 [AI Core / legacy] Gemini 경로 (${modelId}) 호출 시도...`)
  const model = genAI.getGenerativeModel({ 
    model: modelId,
    generationConfig: maxOutputTokens ? { maxOutputTokens } : undefined 
  })
  const result = await model.generateContent(prompt)
  console.log(`✅ [AI Core / legacy] (${modelId}) 생성 성공! (maxTokens: ${maxOutputTokens || 'auto'})`)
  return result.response.text().trim()
}

// ── 공개 진입점 ────────────────────────────────────────────────
export async function generateEnforcedAIContent(
  prompt: string,
  preferredModel?: string,
  maxOutputTokens?: number
): Promise<string> {
  let primaryModel = preferredModel || 'gemma-4-26b-a4b-it'
  if (primaryModel === 'gemma-4-31b-it') {
    primaryModel = 'gemma-4-26b-a4b-it' // Force fallback to faster 26B
  }

  // Gemma 계열: @ai-sdk/google 경로 사용 (1차 시도 → fallback Gemini)
  if (isGemmaModel(primaryModel)) {
    try {
      return await generateWithAiSdkGoogle(prompt, primaryModel, maxOutputTokens)
    } catch (err1) {
      console.warn(
        `⚠️  [AI Core] Gemma (${primaryModel}) 실패. Gemini fallback 진행...`,
        err1
      )
      // Gemma 실패 시 안정적인 Gemma 26B 또는 Gemini Lite 모델로 강등
      try {
        return await generateWithAiSdkGoogle(prompt, 'gemma-4-26b-a4b-it', maxOutputTokens)
      } catch (err2) {
        console.warn('⚠️  [AI Core] Gemma 26b fallback 실패. Gemini Lite 시도...', err2)
        return await generateWithLegacySdk(prompt, 'gemini-3.1-flash-lite', maxOutputTokens)
      }
    }
  }

  // Gemini 계열: 구 SDK 경로 사용 (기존 동작 유지)
  const fallbackModel1 =
    primaryModel === 'gemini-3.5-flash-lite' ? 'gemini-3.1-flash-lite' : 'gemini-3.5-flash-lite'
  const fallbackModel2 = 'gemini-2.5-flash'

  try {
    return await generateWithLegacySdk(prompt, primaryModel, maxOutputTokens)
  } catch (err1) {
    console.warn(
      `⚠️  [AI Core] 1순위 (${primaryModel}) 실패. 2순위 (${fallbackModel1}) 시도...`,
      err1
    )
    try {
      return await generateWithLegacySdk(prompt, fallbackModel1, maxOutputTokens)
    } catch (err2) {
      console.warn(
        `⚠️  [AI Core] 2순위 (${fallbackModel1}) 실패. 최종 (${fallbackModel2}) 시도...`,
        err2
      )
      try {
        return await generateWithLegacySdk(prompt, fallbackModel2, maxOutputTokens)
      } catch (err3) {
        console.error('🚨 [AI Core] 모든 AI 모델 호출 실패!', err3)
        throw new Error('All configured AI models failed to generate content.')
      }
    }
  }
}
