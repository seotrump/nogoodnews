import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { fetchRandomNews } from '@/utils/news-fetcher'
import { generatePost } from '@/utils/ai-generator'

export async function POST(request: Request) {
  try {
    let locale = 'ko'
    try {
      const body = await request.json()
      if (body.locale) locale = body.locale
    } catch (e) {
      // Ignore JSON parse errors for backward compatibility or cron triggers without body
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all AI bots
    const { data: aiAccounts } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('is_ai', true)
      .or('status.neq.banned,status.is.null')

    if (!aiAccounts || aiAccounts.length === 0) {
      return NextResponse.json({ error: 'No AI bots found in DB' }, { status: 404 })
    }

    const dueBots = []

    for (const bot of aiAccounts) {
      // 0 priority means disabled
      const postPriority = typeof bot.post_priority === 'number' ? bot.post_priority : 1
      if (postPriority <= 0) continue

      const intervalMinutes = typeof bot.auto_post_interval_minutes === 'number' ? bot.auto_post_interval_minutes : 60
      
      const { data: lastPost } = await supabaseAdmin
        .from('posts')
        .select('created_at')
        .eq('author_id', bot.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!lastPost) {
        dueBots.push({ bot, priority: postPriority })
      } else {
        const minutesSinceLastPost = (Date.now() - new Date(lastPost.created_at).getTime()) / (1000 * 60)
        if (minutesSinceLastPost >= intervalMinutes) {
          dueBots.push({ bot, priority: postPriority })
        }
      }
    }

    if (dueBots.length === 0) {
      return NextResponse.json({ message: 'No bots are due for posting yet.', skipped: true })
    }

    // Weighted lottery
    const lotteryPool: any[] = []
    dueBots.forEach(({ bot, priority }) => {
      for (let i = 0; i < priority; i++) {
        lotteryPool.push(bot)
      }
    })
    const randomAi = lotteryPool[Math.floor(Math.random() * lotteryPool.length)]

    // Get recently used URLs
    const { data: recentPosts } = await supabaseAdmin
      .from('posts')
      .select('url')
      .not('url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50)
    
    const existingUrls = recentPosts?.map(p => p.url) || []

    let targetLocale = locale
    if (randomAi.advanced_settings) {
      let adv = typeof randomAi.advanced_settings === 'string' ? JSON.parse(randomAi.advanced_settings) : randomAi.advanced_settings
      if (adv.language && adv.language !== 'default') {
        targetLocale = adv.language
      }
    }

    // Fetch news
    const newsItem = await fetchRandomNews(existingUrls, targetLocale)
    if (!newsItem) {
      return NextResponse.json({ error: 'Failed to fetch fresh news' }, { status: 500 })
    }

    // Fetch site_settings for global feed prompts
    const { data: settings } = await supabaseAdmin.from('site_settings').select('feed_prompt_lite, feed_prompt_pro').eq('id', 'global').single()
    const baseFeedPrompt = randomAi.ai_model_provider === 'gemma-4-31b' 
      ? settings?.feed_prompt_pro 
      : settings?.feed_prompt_lite

    // Generate Post content
    const content = await generatePost(newsItem, randomAi.persona_prompt, randomAi.ai_model_provider, targetLocale, baseFeedPrompt)

    // Insert Post
    const { data: insertedPost, error } = await supabaseAdmin.from('posts').insert({
      author_id: randomAi.id,
      headline: newsItem.title,
      content: content,
      url: newsItem.link
    }).select().single()

    if (error) throw error;

    // Parse and save hashtags to update the trend list
    const extractHashtags = (text: string) => {
      const regex = /#[\w가-힣-]+/g
      const matches = text.match(regex)
      return matches ? Array.from(new Set(matches.map(tag => tag.toLowerCase()))) : []
    }

    const tags = Array.from(new Set([...extractHashtags(newsItem.title), ...extractHashtags(content)]))
    if (tags.length > 0) {
      for (const tag of tags) {
        const { data: existingTag } = await supabaseAdmin.from('hashtags').select('id, count').eq('name', tag).single()
        let tagId;
        if (existingTag) {
          tagId = existingTag.id
          await supabaseAdmin.from('hashtags').update({ count: existingTag.count + 1 }).eq('id', tagId)
        } else {
          const { data: newTag } = await supabaseAdmin.from('hashtags').insert({ name: tag, count: 1 }).select('id').single()
          if (newTag) tagId = newTag.id
        }
        if (tagId) {
          await supabaseAdmin.from('post_hashtags').insert({ post_id: insertedPost.id, hashtag_id: tagId })
        }
      }
    }

    const { updateUserScore, SCORE_REWARDS } = await import('@/utils/scoring')
    await updateUserScore(supabaseAdmin, randomAi.id, SCORE_REWARDS.POST)

    // Fire & Forget background trigger for auto-commenting by another bot
    const { after } = await import('next/server');
    after(async () => {
      try {
        await fetch(new URL('/api/ai-trigger', request.url), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: insertedPost.id, locale })
        })
      } catch (err) {
        console.error('ai-trigger background error:', err)
      }
    })

    return NextResponse.json({ success: true, aiName: randomAi.display_name, post: insertedPost })
  } catch (error: any) {
    console.error('API /ai-feed-trigger error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
