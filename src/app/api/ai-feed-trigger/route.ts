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

    // 1. 활성화된 모든 AI 봇 정보 및 계정 카테고리 가져오기
    const { data: aiAccounts } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('is_ai', true)
      .or('status.neq.banned,status.is.null')

    if (!aiAccounts || aiAccounts.length === 0) {
      return NextResponse.json({ error: 'No AI bots found in DB' }, { status: 404 })
    }

    // 2. 포스팅 주기가 도달한(Due) 봇 추출 및 각 봇의 마지막 작성 시간 기록
    const dueBots: { bot: any; priority: number; category: string; lastPostTime: number }[] = []

    for (const bot of aiAccounts) {
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

      const lastPostTime = lastPost ? new Date(lastPost.created_at).getTime() : 0
      const minutesSinceLastPost = lastPost ? (Date.now() - lastPostTime) / (1000 * 60) : 999999

      if (!lastPost || minutesSinceLastPost >= intervalMinutes) {
        const botCategory = bot.category || 'society'
        dueBots.push({ bot, priority: postPriority, category: botCategory, lastPostTime })
      }
    }

    if (dueBots.length === 0) {
      return NextResponse.json({ message: 'No bots are due for posting yet.', skipped: true })
    }

    // 3. 최근 작성된 게시글 15개를 가져와 최근에 노출된 분야 카테고리 순서 파악
    const { data: recentFeedPosts } = await supabaseAdmin
      .from('posts')
      .select('author_id, accounts(category)')
      .order('created_at', { ascending: false })
      .limit(15)

    const recentCategoryCounts: Record<string, number> = {}
    if (recentFeedPosts) {
      recentFeedPosts.forEach(p => {
        const cat = (p.accounts as any)?.category || 'society'
        recentCategoryCounts[cat] = (recentCategoryCounts[cat] || 0) + 1
      })
    }

    // 4. [1단계: 분야 로테이션] 준비된 봇들이 속한 분야 중 최근 피드 노출 빈도가 가장 적은 분야 순으로 정렬
    const categoryScores: Record<string, number> = {}
    dueBots.forEach(item => {
      categoryScores[item.category] = recentCategoryCounts[item.category] || 0
    })

    // 가장 노출 빈도가 적은 최소 카테고리 점수 산출
    const minCategoryScore = Math.min(...Object.values(categoryScores))
    const priorityCategories = Object.keys(categoryScores).filter(cat => categoryScores[cat] === minCategoryScore)

    // 5. [2단계: 분야 내 복수 봇 추첨] 최소 노출 분야에 속한 봇들 필터링
    let candidateBots = dueBots.filter(item => priorityCategories.includes(item.category))
    if (candidateBots.length === 0) candidateBots = dueBots

    // 복수 봇 중 가장 오랫동안 글을 안 쓴 봇 우선 가중치 부여 (Last Written Time 기반 추첨)
    const lotteryPool: any[] = []
    candidateBots.forEach(({ bot, priority, lastPostTime }) => {
      // 오랫동안 안 쓴 봇일수록 추첨 티켓 수 증대 (시간 쿨다운 우대)
      const hoursSinceLastPost = Math.min(Math.floor((Date.now() - lastPostTime) / (1000 * 60 * 60)), 24) + 1
      const tickets = priority * hoursSinceLastPost
      for (let i = 0; i < tickets; i++) {
        lotteryPool.push(bot)
      }
    })

    const randomAi = lotteryPool[Math.floor(Math.random() * lotteryPool.length)]

    // 6. 최근 사용된 뉴스 URL 중복 방지
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

    // 7. 봇의 전문 분야에 특화된 뉴스 수집 및 피드 내용 생성
    const botCategory = randomAi.category || 'society'
    const newsItem = await fetchRandomNews(existingUrls, targetLocale, botCategory)
    if (!newsItem) {
      return NextResponse.json({ error: 'Failed to fetch fresh news' }, { status: 500 })
    }

    const { data: settings } = await supabaseAdmin.from('site_settings').select('feed_prompt_lite, feed_prompt_pro').eq('id', 'global').single()
    const baseFeedPrompt = (randomAi.ai_model_provider === 'gemini-3.5-flash-lite' || randomAi.ai_model_provider === 'gemma-4-31b')
      ? settings?.feed_prompt_pro 
      : settings?.feed_prompt_lite

    const content = await generatePost(newsItem, randomAi.persona_prompt, randomAi.ai_model_provider, targetLocale, baseFeedPrompt)

    // 8. 게시글 저장 (우리 봇이 생성한 어그로 헤드라인 저장 & 원문 기사 제목은 link_title 저장)
    const firstLineHeadline = content.split('\n')[0].replace(/^#+\s*/, '').trim() || newsItem.title

    let insertedPost: any = null
    const insertPayload = {
      author_id: randomAi.id,
      headline: firstLineHeadline,
      content: content,
      url: newsItem.link
    }

    const { data: resData, error: insertError } = await supabaseAdmin.from('posts').insert({
      ...insertPayload,
      link_title: newsItem.title
    }).select().single()

    if (insertError) {
      const { data: fallbackData, error: fallbackError } = await supabaseAdmin.from('posts').insert(insertPayload).select().single()
      if (fallbackError) throw fallbackError
      insertedPost = fallbackData
    } else {
      insertedPost = resData
    }

    // 9. 해시태그 업데이트
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

    // 10. 댓글 자동 달기 연동 (Next.js after background trigger)
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

    return NextResponse.json({ success: true, aiName: randomAi.display_name, category: botCategory, post: insertedPost })
  } catch (error: any) {
    console.error('API /ai-feed-trigger error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
