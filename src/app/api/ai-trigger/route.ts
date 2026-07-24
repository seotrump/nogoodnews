import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// 지목 기능: 이름 포함 여부 및 유사도 판별
function isNameTargeted(comment: string, name: string): boolean {
  const c = comment.toLowerCase();
  const n = name.toLowerCase().trim();

  if (c.includes(n)) return true;

  const t = comment.toLowerCase();
  const commonChars = [...n].filter(char => t.includes(char)).length;
  return (commonChars / n.length) >= 0.6;
}

const processingPosts = new Set<string>();

export async function POST(request: Request) {
  let requestPostId: string | null = null;
  try {
    const body = await request.json()
    const { postId, locale = 'ko' } = body
    if (!postId) return NextResponse.json({ error: 'Missing postId' }, { status: 400 })
    requestPostId = postId;

    if (processingPosts.has(postId)) {
      return NextResponse.json({ message: 'Already processing' });
    }
    processingPosts.add(postId);

    // 브라우저 지연이 아닌 서버 자체 지연으로 롤백 (클라이언트 언마운트 시 취소 방지 및 완벽한 동기화)
    console.log(`🚨 [ai-trigger] 15초 대기 시작... (Post: ${postId})`);
    await delay(15000);

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: post } = await supabaseAdmin.from('posts').select('*').eq('id', postId).single()
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    const { data: comments } = await supabaseAdmin
      .from('comments')
      .select('*, accounts(display_name, is_ai)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (comments && comments.length > 0) {
      const lastComment = comments[comments.length - 1]
      if (lastComment.accounts?.is_ai) {
        return NextResponse.json({ message: 'Last comment is by AI, skipping.' })
      }
    }

    const { data: aiAccounts } = await supabaseAdmin.from('accounts').select('*').eq('is_ai', true).eq('status', 'active')
    if (!aiAccounts || aiAccounts.length === 0) {
      return NextResponse.json({ error: 'No AI bots found' }, { status: 404 })
    }

    let triggerUserId = post.author_id;
    let latestComment = '';
    
    if (comments && comments.length > 0) {
      triggerUserId = comments[comments.length - 1].author_id;
      latestComment = comments[comments.length - 1].content;
    }

    const { data: userData } = await supabaseAdmin.from('accounts').select('level').eq('id', triggerUserId).single();
    const userLevel = userData?.level || 1;

    const { data: followsData } = await supabaseAdmin.from('follows').select('following_id').eq('follower_id', triggerUserId);
    const followedBotIds = new Set(followsData?.map(f => f.following_id) || []);

    const allowedBots = aiAccounts.filter(bot => {
      const botTier = bot.level || 1;
      return botTier <= userLevel || followedBotIds.has(bot.id);
    });

    if (allowedBots.length === 0) {
      return NextResponse.json({ error: 'No bots allowed for this user tier' }, { status: 403 })
    }

    let randomAi = null;
    
    if (latestComment) {
      const targetedBot = allowedBots.find(bot => {
        const mentioned = latestComment.includes(`@${bot.username}`);
        return mentioned || isNameTargeted(latestComment, bot.display_name);
      });
      
      if (targetedBot) {
        randomAi = targetedBot;
      }
    }

    if (!randomAi) {
      const lotteryPool: any[] = []
      allowedBots.forEach(bot => {
        const priority = typeof bot.comment_priority === 'number' ? bot.comment_priority : 1
        for (let i = 0; i < priority; i++) lotteryPool.push(bot)
      })
      if (lotteryPool.length === 0) return NextResponse.json({ error: 'No bots available in allowed pool' }, { status: 404 })
      randomAi = lotteryPool[Math.floor(Math.random() * lotteryPool.length)]
    }

    let recentCommentsContext = ''
    if (comments && comments.length > 0) {
      recentCommentsContext = comments.slice(-5).map((c: any) => `${c.accounts?.display_name || '익명'}: ${c.content}`).join('\n')
    }

    const { generateComment } = await import('@/utils/ai-generator')
    const aiText = await generateComment(post.headline, post.content, randomAi.persona_prompt, randomAi.ai_model_provider, recentCommentsContext, locale)

    await supabaseAdmin.from('comments').insert({
      post_id: postId,
      author_id: randomAi.id,
      content: aiText
    })

    const { updateUserScore, SCORE_REWARDS } = await import('@/utils/scoring')
    await updateUserScore(supabaseAdmin, randomAi.id, SCORE_REWARDS.FIRST_COMMENT)

    // [핵심 해결책] DB에 Insert 후 Next.js 서버 캐시를 강제로 파기합니다!
    revalidatePath(`/${locale}/posts/${postId}`);
    revalidatePath(`/posts/${postId}`);
    revalidatePath('/', 'layout'); // 만약을 위해 전체 레이아웃 라우터 캐시 힌트 갱신

    return NextResponse.json({ success: true, aiName: randomAi.display_name })
  } catch (error: any) {
    console.error('API /ai-trigger error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    if (requestPostId) {
      processingPosts.delete(requestPostId);
    }
  }
}