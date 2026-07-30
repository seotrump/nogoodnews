'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { fetchRandomNews } from '@/utils/news-fetcher'
import { generatePost } from '@/utils/ai-generator'
import { isAdmin, ADMIN_EMAIL } from '@/utils/auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://missing-url',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'missing-key'
)

const ALLOWED_MODELS = [
  'gemma-4-26b',
  'gemma-4-31b',
  'gemini-3.1-flash-lite'
] as const;

export async function toggleBadge(userId: string, badgeName: string = 'reporter') {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user)) throw new Error('Unauthorized')

  const { data: account, error: accountError } = await supabaseAdmin.from('accounts').select('badges').eq('id', userId).single()
  if (accountError) {
    console.error('Error fetching account for toggleBadge:', accountError)
  }
  if (!account) throw new Error('User not found')

  let currentBadges = account.badges || []
  if (currentBadges.includes(badgeName)) {
    currentBadges = currentBadges.filter((b: string) => b !== badgeName)
  } else {
    currentBadges = [...currentBadges, badgeName]
  }

  const { error } = await supabaseAdmin.from('accounts').update({ badges: currentBadges }).eq('id', userId)
  if (error) throw new Error('Failed to update badges')
  
  revalidatePath('/admin/users')
  revalidatePath('/admin/robot')
}

export async function createAiBot(formData: FormData) {
  const displayName = formData.get('displayName') as string
  const personaPrompt = formData.get('personaPrompt') as string

  // 허용된 3개 모델만 데이터베이스에 들어가도록 필터링 (단일 컬럼)
  let aiModelProvider = formData.get('aiModelProvider') as string
  if (!ALLOWED_MODELS.includes(aiModelProvider as any)) {
    aiModelProvider = 'gemma-4-26b' // 기본값 강제 적용
  }

  const interval = parseInt((formData.get('interval') as string) || '60')
  const postPriority = parseInt((formData.get('postPriority') as string) || '1')
  const commentPriority = parseInt((formData.get('commentPriority') as string) || '1')


  
  let finalUsername = formData.get('username') as string
  if (!finalUsername) {
    const { data: existingBots } = await supabaseAdmin.from('accounts').select('username').eq('is_ai', true)
    
    if (aiModelProvider === 'gemma-4-31b') {
      let maxPpIndex = 0
      existingBots?.forEach(b => {
        if (b.username && /^PP\d+$/.test(b.username)) {
          const num = parseInt(b.username.slice(2))
          if (num > maxPpIndex) maxPpIndex = num
        }
      })
      finalUsername = `PP${maxPpIndex + 1}`
    } else {
      const limit = 999
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      let maxGlobalIndex = 0
      
      existingBots?.forEach(b => {
        if (b.username && /^[A-Z]{2}\d+$/.test(b.username) && !b.username.startsWith('PP')) {
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
  }

  const inputEmail = formData.get('loginEmail') as string
  const emailId = inputEmail || `bot_${finalUsername.toLowerCase()}_${Date.now()}@nogoodnews.com`
  const botPassword = formData.get('loginPassword') as string || 'aa1111'

  let botId: string;
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: emailId,
    password: botPassword,
    email_confirm: true
  })

  if (authError) {
    if (authError.message.includes('already been registered') || (authError as any).code === 'email_exists') {
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
      const found = existingUsers?.users?.find(u => u.email === emailId)
      if (found) {
        botId = found.id
      } else {
        throw new Error(`Failed to create AI auth user: ${authError.message}`)
      }
    } else {
      console.error('Failed to create AI auth user:', authError)
      throw new Error(`Failed to create AI auth user: ${authError.message}`)
    }
  } else {
    botId = authData.user!.id
  }
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

export async function forceAiPost(locale: string = 'ko', modelType?: 'pro' | 'lite') {
  try {
    let { data: aiAccounts } = await supabaseAdmin.from('accounts').select('*').eq('is_ai', true).eq('status', 'active')
    if (!aiAccounts || aiAccounts.length === 0) throw new Error('No AI bots found')

    if (modelType === 'pro') {
      aiAccounts = aiAccounts.filter((bot: any) => bot.ai_model_provider === 'gemma-4-31b')
    } else if (modelType === 'lite') {
      aiAccounts = aiAccounts.filter((bot: any) => bot.ai_model_provider === 'gemma-4-26b' || !bot.ai_model_provider)
    }

    if (aiAccounts.length === 0) throw new Error(`해당 모델(${modelType})을 사용하는 활성 봇이 없습니다.`)

    const lotteryPool: any[] = []
    aiAccounts.forEach((bot: any) => {
      const priority = typeof bot.post_priority === 'number' ? bot.post_priority : 1
      if (priority > 0) {
        for (let i = 0; i < priority; i++) lotteryPool.push(bot)
      }
    })

    if (lotteryPool.length === 0) throw new Error('게재 불가: 봇 우선순위 0')

    const randomAi = lotteryPool[Math.floor(Math.random() * lotteryPool.length)]
    const { data: recentPosts } = await supabaseAdmin.from('posts').select('url').not('url', 'is', null).order('created_at', { ascending: false }).limit(50)
    const existingUrls = recentPosts?.map(p => p.url) || []

    let targetLocale = locale
    if (randomAi.advanced_settings) {
      let adv = typeof randomAi.advanced_settings === 'string' ? JSON.parse(randomAi.advanced_settings) : randomAi.advanced_settings
      if (adv.language && adv.language !== 'default') {
        targetLocale = adv.language
      }
    }

    const newsItem = await fetchRandomNews(existingUrls, targetLocale)
    if (!newsItem) throw new Error('Failed to fetch news (no fresh news or rate limited)')

    const { data: settings } = await supabaseAdmin.from('site_settings').select('feed_prompt_lite, feed_prompt_pro').eq('id', 'global').single()
    const baseFeedPrompt = randomAi.ai_model_provider === 'gemma-4-31b' 
      ? settings?.feed_prompt_pro 
      : settings?.feed_prompt_lite

    const content = await generatePost(newsItem, randomAi.persona_prompt, randomAi.ai_model_provider, targetLocale, baseFeedPrompt)

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
    
    return { success: true }
  } catch (error: any) {
    console.error('forceAiPost error:', error)
    return { error: error.message || 'Unknown error occurred' }
  }
}

export async function updateAiBotSettings(formData: FormData) {
  const botId = formData.get('botId') as string
  if (!botId) throw new Error('Missing bot ID')

  let aiModelProvider = formData.get('aiModelProvider') as string
  if (!ALLOWED_MODELS.includes(aiModelProvider as any)) {
    aiModelProvider = 'gemma-4-26b' // 수정 시에도 기본값 강제 적용
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

  const loginEmail = formData.get('loginEmail') as string
  const loginPassword = formData.get('loginPassword') as string

  // Update auth user email and password if provided or if username changed
  const newEmail = loginEmail || (updateData.username ? `${updateData.username.toLowerCase()}@nogoodnews.com` : undefined)
  const newPassword = loginPassword || 'aa1111' // Only if we want to force reset, but if they provide it we use it
  
  if (newEmail || loginPassword) {
    await supabaseAdmin.auth.admin.updateUserById(botId, {
      ...(newEmail && { email: newEmail }),
      ...(loginPassword && { password: loginPassword }),
      email_confirm: true
    }).catch(console.error)
  }

  // Update email column in accounts if it changed
  if (newEmail) {
    await supabaseAdmin.from('accounts').update({ email: newEmail }).eq('id', botId)
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

export async function resetUserScore(userId: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    throw new Error('Unauthorized')
  }

  const { error } = await supabaseAdmin
    .from('accounts')
    .update({ activity_score: 0 })
    .eq('id', userId)

  if (error) {
    console.error('Failed to reset score:', error)
    throw new Error('Failed to reset score')
  }

  revalidatePath('/[locale]/admin/rank')
  revalidatePath('/[locale]/admin/robot')
}

export async function getRankingStats() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    throw new Error('Unauthorized')
  }

  const { data: accounts, error } = await supabaseAdmin
    .from('accounts')
    .select('id, display_name, is_ai, level, activity_score, avatar_url')
    .order('activity_score', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Failed to fetch ranking stats:', error)
    throw new Error('Failed to fetch ranking stats: ' + error.message)
  }

  return accounts || []
}

export async function updateSystemPrompts(formData: FormData) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    throw new Error('Unauthorized')
  }

  const autoBotPrompt = formData.get('autoBotPrompt') as string
  const autoBotProfilePrompt = formData.get('autoBotProfilePrompt') as string
  const proBotPrompt1 = formData.get('proBotPrompt1') as string
  const proBotPrompt2 = formData.get('proBotPrompt2') as string
  const proBotPrompt3 = formData.get('proBotPrompt3') as string
  const proBotPrompt4 = formData.get('proBotPrompt4') as string
  
  const feedPromptLite = formData.get('feedPromptLite') as string
  const feedPromptPro = formData.get('feedPromptPro') as string

  const updateData: any = {}
  if (autoBotPrompt !== null) updateData.auto_bot_prompt = autoBotPrompt
  if (autoBotProfilePrompt !== null) updateData.auto_bot_profile_prompt = autoBotProfilePrompt
  if (proBotPrompt1 !== null) updateData.pro_bot_prompt_1_concept = proBotPrompt1
  if (proBotPrompt2 !== null) updateData.pro_bot_prompt_2_script = proBotPrompt2
  if (proBotPrompt3 !== null) updateData.pro_bot_prompt_3_param = proBotPrompt3
  if (proBotPrompt4 !== null) updateData.pro_bot_prompt_4_avatar = proBotPrompt4
  if (feedPromptLite !== null) updateData.feed_prompt_lite = feedPromptLite
  if (feedPromptPro !== null) updateData.feed_prompt_pro = feedPromptPro

  const { error } = await supabaseAdmin
    .from('site_settings')
    .update(updateData)
    .eq('id', 'global')

  if (error) {
    console.error('Failed to update system prompts:', error)
    throw new Error('Failed to update system prompts')
  }

  revalidatePath('/[locale]/admin')
  revalidatePath('/[locale]/admin/robot')
}

export async function suspendAccount(accountId: string, suspend: boolean) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    throw new Error('Unauthorized')
  }

  const { error } = await supabaseAdmin
    .from('accounts')
    .update({ status: suspend ? 'banned' : 'active' })
    .eq('id', accountId)

  if (error) {
    console.error('Failed to suspend/restore account:', error)
    throw new Error('Failed to update account status')
  }

  revalidatePath('/[locale]/admin/users')
  revalidatePath('/[locale]/admin/robot')
}

export async function deleteAccount(accountId: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    throw new Error('Unauthorized')
  }

  // Verify that the account is suspended before deleting
  const { data: account, error: fetchError } = await supabaseAdmin
    .from('accounts')
    .select('status')
    .eq('id', accountId)
    .single()

  if (fetchError || !account) {
    throw new Error('Account not found')
  }

  if (account.status !== 'banned') {
    throw new Error('Account must be suspended (banned) before deletion')
  }

  // Delete from Auth (which cascades to accounts, posts, comments etc.)
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(accountId)

  if (deleteError) {
    console.error('Failed to delete user from auth:', deleteError)
    throw new Error('Failed to permanently delete user')
  }

  revalidatePath('/[locale]/admin/users')
  revalidatePath('/[locale]/admin/robot')
}