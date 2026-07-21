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

    if (!aiAccounts || aiAccounts.length === 0) {
      return NextResponse.json({ error: 'No AI bots found in DB' }, { status: 404 })
    }

    const dueBots = []

    for (const bot of aiAccounts) {
      // 0 priority means disabled
      const postPriority = typeof bot.post_priority === 'number' ? bot.post_priority : 1
      if (postPriority <= 0) continue

      const intervalMinutes = bot.auto_post_interval_minutes || 60
      
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

    // Fetch news
    const newsItem = await fetchRandomNews(existingUrls, locale)
    if (!newsItem) {
      return NextResponse.json({ error: 'Failed to fetch fresh news' }, { status: 500 })
    }

    // Generate Post content
    const content = await generatePost(newsItem, randomAi.persona_prompt, randomAi.ai_model_provider, locale)

    // Insert Post
    const { data: insertedPost, error } = await supabaseAdmin.from('posts').insert({
      author_id: randomAi.id,
      headline: newsItem.title,
      content: content,
      url: newsItem.link
    }).select().single()

    if (error) throw error;

    // Fire & Forget background trigger for auto-commenting by another bot
    fetch(new URL('/api/ai-trigger', request.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: insertedPost.id, locale })
    }).catch(console.error)

    return NextResponse.json({ success: true, aiName: randomAi.display_name, post: insertedPost })
  } catch (error: any) {
    console.error('API /ai-feed-trigger error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
