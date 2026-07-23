'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { fetchRandomNews } from '@/utils/news-fetcher'
import { generatePost } from '@/utils/ai-generator'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 확정된 3대 모델 라인업
const ALLOWED_MODELS = [
  'base-gemma-4-26b',
  'gemma-4-31b',
  'gemini-3.1-flash-lite'
] as const;

export async function createAiBot(formData: FormData) {
  const displayName = formData.get('displayName') as string
  const personaPrompt = formData.get('personaPrompt') as string

  // 허용된 3개 모델만 데이터베이스에 들어가도록 필터링 (단일 컬럼)
  let aiModelProvider = formData.get('aiModelProvider') as string
  if (!ALLOWED_MODELS.includes(aiModelProvider as any)) {
    aiModelProvider = 'base-gemma-4-26b' // 기본값 강제 적용
  }

  const interval = parseInt((formData.get('interval') as string) || '60')
  const postPriority = parseInt((formData.get('postPriority') as string) || '1')
  const commentPriority = parseInt((formData.get('commentPriority') as string) || '1')

  const emailId = `ai-bot-${Date.now()}@nogoodnews.com`
  
  let finalUsername = formData.get('username') as string
  if (!finalUsername) {
    const { data: existingBots } = await supabaseAdmin.from('accounts').select('username').eq('is_ai', true)
    const limit = 999
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    let maxGlobalIndex = 0
    
    existingBots?.forEach(b => {
      if (b.username && /^[A-Z]{2}\d+$/.test(b.username)) {
        const char = b.username[0]
        const prefixIndex = alphabet.indexOf(char)
        if (prefixIndex !== -1) {
          const num = parseInt(b.username.slice(2))
          const globalIndex = prefixIndex * limit + num
          if (globalIndex > maxGlobalIndex) {
            maxGlobalIndex = globalIndex
          }
        }
      }
    })

    const nextGlobalIndex = maxGlobalIndex + 1
    const prefixIndex = Math.floor((nextGlobalIndex - 1) / limit)
    if (prefixIndex >= alphabet.length) {
      throw new Error('Bot username limit reached (ZZ999)')
    }
    
    const char = alphabet[prefixIndex]
    const num = ((nextGlobalIndex - 1) % limit) + 1
    finalUsername = `${char}${char}${num}`
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: emailId,
    password: 'MockPassword123!',
    email_confirm: true
  })

  if (authError) throw new Error('Failed to create AI auth user')

  const botId = authData.user!.id
  const category = formData.get('category') as string || null
  
  let advancedSettings = {}
  try {
    const rawSettings = formData.get('advancedSettings') as string
    if (rawSettings) advancedSettings = JSON.parse(rawSettings)
  } catch (e) {
    console.error('Failed to parse advanced settings', e)
  }

  const botTier = parseInt((formData.get('botTier') as string) || '1')

  const { error: accountError } = await supabaseAdmin.from('accounts').insert({
    id: botId,
    email: emailId,
    display_name: displayName,
    username: finalUsername,
    is_ai: true,
    persona_prompt: personaPrompt,
    ai_model_provider: aiModelProvider, // 기존 단일 컬럼만 사용
    auto_post_interval_minutes: interval,
    post_priority: postPriority,
    comment_priority: commentPriority,
    level: botTier,
    avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${botId}`,
    category: category,
    advanced_settings: advancedSettings
  })

  if (accountError) throw new Error('Failed to update AI account')

  revalidatePath('/admin')
}

export async function forceAiPost(locale: string = 'ko') {
  const { data: aiAccounts } = await supabaseAdmin.from('accounts').select('*').eq('is_ai', true).eq('status', 'active')
  if (!aiAccounts || aiAccounts.length === 0) throw new Error('No AI bots found')

  const lotteryPool: any[] = []
  aiAccounts.forEach(bot => {
    const priority = typeof bot.post_priority === 'number' ? bot.post_priority : 1
    if (priority > 0) {
      for (let i = 0; i < priority; i++) lotteryPool.push(bot)
    }
  })

  if (lotteryPool.length === 0) throw new Error('게재 불가: 봇 우선순위 0')

  const randomAi = lotteryPool[Math.floor(Math.random() * lotteryPool.length)]
  const { data: recentPosts } = await supabaseAdmin.from('posts').select('url').not('url', 'is', null).order('created_at', { ascending: false }).limit(50)
  const existingUrls = recentPosts?.map(p => p.url) || []

  const newsItem = await fetchRandomNews(existingUrls, locale)
  if (!newsItem) throw new Error('Failed to fetch news')

  const content = await generatePost(newsItem, randomAi.persona_prompt, randomAi.ai_model_provider, locale)

  const { data: insertedPost, error } = await supabaseAdmin.from('posts').insert({
    author_id: randomAi.id,
    headline: newsItem.title,
    content: content,
    url: newsItem.link
  }).select().single()

  if (error) throw error

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  fetch(`${baseUrl}/api/ai-trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId: insertedPost.id, locale })
  }).catch(console.error)

  revalidatePath('/')
  revalidatePath('/admin')
}

export async function updateAiBotSettings(formData: FormData) {
  const botId = formData.get('botId') as string
  if (!botId) throw new Error('Missing bot ID')

  let aiModelProvider = formData.get('aiModelProvider') as string
  if (!ALLOWED_MODELS.includes(aiModelProvider as any)) {
    aiModelProvider = 'base-gemma-4-26b' // 수정 시에도 기본값 강제 적용
  }

  const category = formData.get('category') as string || null
  let advancedSettings = undefined
  try {
    const rawSettings = formData.get('advancedSettings') as string
    if (rawSettings) advancedSettings = JSON.parse(rawSettings)
  } catch (e) {
    console.error('Failed to parse advanced settings', e)
  }

  const updateData: any = {
    username: formData.get('username') || null,
    display_name: formData.get('displayName'),
    persona_prompt: formData.get('personaPrompt'),
    ai_model_provider: aiModelProvider, // 기존 단일 컬럼만 업데이트
    auto_post_interval_minutes: parseInt((formData.get('interval') as string) || '60'),
    post_priority: parseInt((formData.get('postPriority') as string) || '1'),
    comment_priority: parseInt((formData.get('commentPriority') as string) || '1'),
    status: formData.get('status') as string || 'active'
  }

  const botTier = formData.get('botTier') as string;
  if (botTier) {
    updateData.level = parseInt(botTier);
  }

  if (category) updateData.category = category
  if (advancedSettings) updateData.advanced_settings = advancedSettings

  const { error } = await supabaseAdmin.from('accounts').update(updateData).eq('id', botId)
  if (error) {
    if (error.code === '23505') { // Postgres unique_violation
      throw new Error('DUPLICATE_USERNAME')
    }
    throw new Error('Failed to update settings')
  }

  revalidatePath('/admin')
  revalidatePath(`/admin/bots/${botId}`)
}

export async function updateUserAdminSettings(formData: FormData) {
  const userId = formData.get('userId') as string
  if (!userId) throw new Error('Missing user ID')

  const updateData: any = {
    level: parseInt((formData.get('level') as string) || '1'),
    membership_type: formData.get('membershipType') as string || 'free',
    status: formData.get('status') as string || 'active'
  }

  const { error } = await supabaseAdmin.from('accounts').update(updateData).eq('id', userId)
  if (error) {
    throw new Error('Failed to update user settings')
  }

  revalidatePath('/admin')
  revalidatePath(`/admin/users/${userId}`)
}