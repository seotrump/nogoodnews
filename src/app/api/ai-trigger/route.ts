import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// 지목 기능: 이름 포함 여부 및 유사도 판별
function isNameTargeted(comment: string, name: string): boolean {
  const c = comment.toLowerCase();
  const n = name.toLowerCase().trim();

  // 1. 이름이 댓글에 포함되어 있으면 즉시 성공
  if (c.includes(n)) return true;

  // 2. 포함되지 않았다면 유사도 분석 (문장 내 단어 단위로 쪼개어 비교 시도)
  const t = comment.toLowerCase();
  const commonChars = [...n].filter(char => t.includes(char)).length;
  return (commonChars / n.length) >= 0.6; // 봇 이름 글자 수 기준으로 60% 이상 매칭
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { postId, locale = 'ko' } = body
    if (!postId) return NextResponse.json({ error: 'Missing postId' }, { status: 400 })

    // [수정된 핵심 로직] 조건 없이 호출될 때마다 무조건 15초 대기 시작
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

    // [지목 및 등급 필터링 적용]
    // 1. 유저 정보 식별 (마지막 댓글 작성자 또는 게시글 작성자)
    let triggerUserId = post.author_id;
    let latestComment = '';
    
    if (comments && comments.length > 0) {
      triggerUserId = comments[comments.length - 1].author_id;
      latestComment = comments[comments.length - 1].content;
    }

    // 2. 유저 레벨 및 팔로우 목록 조회
    const { data: userData } = await supabaseAdmin.from('accounts').select('level').eq('id', triggerUserId).single();
    const userLevel = userData?.level || 1;

    const { data: followsData } = await supabaseAdmin.from('follows').select('following_id').eq('follower_id', triggerUserId);
    const followedBotIds = new Set(followsData?.map(f => f.following_id) || []);

    // 3. 허용된 봇 후보군 (Pool) 필터링
    const allowedBots = aiAccounts.filter(bot => {
      const botTier = bot.level || 1;
      return botTier <= userLevel || followedBotIds.has(bot.id);
    });

    if (allowedBots.length === 0) {
      return NextResponse.json({ error: 'No bots allowed for this user tier' }, { status: 403 })
    }

    let randomAi = null;
    
    if (latestComment) {
      console.log(`🔍 [ai-trigger] 지목 분석 대상: "${latestComment}"`);
      // 허용된 봇 풀 내에서만 지목 가능
      const targetedBot = allowedBots.find(bot => {
        // 기존 이름 기반 유사도 또는 @username 멘션 확인
        const mentioned = latestComment.includes(`@${bot.username}`);
        return mentioned || isNameTargeted(latestComment, bot.display_name);
      });
      
      if (targetedBot) {
        randomAi = targetedBot;
        console.log(`🎯 [ai-trigger] 지목된 봇: ${randomAi.display_name} (Tier: ${randomAi.level || 1})`);
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

    return NextResponse.json({ success: true, aiName: randomAi.display_name })
  } catch (error: any) {
    console.error('API /ai-trigger error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}