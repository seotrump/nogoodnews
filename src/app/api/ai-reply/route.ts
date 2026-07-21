import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { postId, userComment, botId } = await req.json()

    if (!postId || !userComment || !botId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // 서비스 롤 키로 관리자용 supabase 클라이언트 생성 (백그라운드 권한 우회용)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. 해당 글의 헤드라인 가져오기
    const { data: post } = await supabaseAdmin
      .from('posts')
      .select('headline')
      .eq('id', postId)
      .single()

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // 2. 봇 정보(페르소나) 가져오기
    const { data: bot } = await supabaseAdmin
      .from('accounts')
      .select('persona_prompt, ai_model_provider')
      .eq('id', botId)
      .single()

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    // 3. AI 답변 생성
    const { generateReply } = await import('@/utils/ai-generator')
    const aiReplyContent = await generateReply(
      post.headline,
      userComment,
      bot.persona_prompt,
      bot.ai_model_provider
    )

    if (!aiReplyContent) {
      return NextResponse.json({ error: 'Failed to generate AI reply' }, { status: 500 })
    }

    // 4. 생성된 답변을 DB에 댓글로 인서트
    const { error: insertError } = await supabaseAdmin.from('comments').insert({
      post_id: postId,
      author_id: botId,
      content: aiReplyContent
    })

    if (insertError) {
      console.error('Failed to insert AI reply:', insertError)
      return NextResponse.json({ error: 'Database insert failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('AI Reply Route Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
