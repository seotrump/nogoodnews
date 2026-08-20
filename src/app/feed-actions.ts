'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { isAdmin } from '@/utils/auth'

function getSupabaseAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function deletePost(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!isAdmin(user)) {
    throw new Error('Not authorized to delete posts')
  }

  const supabaseAdmin = getSupabaseAdmin()

  // First, delete all comments associated with the post
  const { error: commentError } = await supabaseAdmin
    .from('comments')
    .delete()
    .eq('post_id', postId)

  if (commentError) {
    console.error('Failed to delete comments:', commentError)
    throw new Error('Failed to delete comments')
  }

  // Then, delete the post
  const { error: postError } = await supabaseAdmin
    .from('posts')
    .delete()
    .eq('id', postId)

  if (postError) {
    console.error('Failed to delete post:', postError)
    throw new Error('Failed to delete post')
  }

  revalidatePath('/', 'layout')
}

export async function deleteMultiplePosts(postIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!isAdmin(user)) {
    throw new Error('Not authorized to delete posts')
  }

  if (!postIds || postIds.length === 0) return

  const supabaseAdmin = getSupabaseAdmin()

  // First, delete all comments associated with these posts
  const { error: commentError } = await supabaseAdmin
    .from('comments')
    .delete()
    .in('post_id', postIds)

  if (commentError) {
    console.error('Failed to delete comments:', commentError)
    throw new Error('Failed to delete comments')
  }

  // Then, delete the posts
  const { error: postError } = await supabaseAdmin
    .from('posts')
    .delete()
    .in('id', postIds)

  if (postError) {
    console.error('Failed to delete posts:', postError)
    throw new Error('Failed to delete posts')
  }

  revalidatePath('/', 'layout')
}

export async function getFeedPosts({
  page = 1,
  limit = 20,
  feed = 'foryou',
  sort = 'latest',
  category = 'all',
  badge = null,
  locale = 'ko',
}: {
  page?: number
  limit?: number
  feed?: string
  sort?: string
  category?: string
  badge?: string | null
  locale?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const offset = (page - 1) * limit

  // 1. "foryou" 피드일 경우 RPC 먼저 시도
  if (feed === 'foryou') {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_foryou_feed', {
      p_user_id: user?.id || null,
      p_locale: locale,
      p_category: category,
      p_limit: limit,
      p_offset: offset
    })

    if (!rpcError && rpcData) {
      // RPC 성공 시 (데이터 구조를 기존 accounts, reactions 중첩 구조로 변환)
      return rpcData.map((p: any) => ({
        ...p,
        accounts: {
          display_name: p.author_display_name,
          is_ai: p.author_is_ai,
          avatar_url: p.author_avatar_url,
          username: p.author_username,
          badges: p.author_badges,
          category: p.author_category
        }
      }))
    }
    // RPC 실패 시 (아직 마이그레이션 적용 안됨 등) 아래의 JS 폴백으로 넘어감
  }

  // 2. 일반 피드 또는 RPC 실패 시 기존 로직 (JS 필터링을 위해 오버페치 후 슬라이싱)
  // 단, 성능을 위해 가져오는 양을 최대 200개로 제한
  let query = supabase
    .from('posts')
    .select('*, accounts(display_name, is_ai, avatar_url, username, badges, category), reactions(id, reaction_type, user_id)')
    .limit(200)

  let followedIds: string[] = []
  if (user) {
    const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', user.id)
    followedIds = follows?.map(f => f.following_id) || []
  }

  if (feed === 'following') {
    if (!user) return []
    if (followedIds.length > 0) {
      query = query.in('author_id', followedIds)
    } else {
      return []
    }
  }

  if (sort === 'comments') {
    query = query.order('comments_count', { ascending: false })
  } else if (sort === 'views') {
    query = query.order('views_count', { ascending: false })
  } else if (feed !== 'foryou') {
    query = query.order('created_at', { ascending: false })
  }

  const { data: rawPosts } = await query
  if (!rawPosts) return []

  const hasKoreanChar = (text: string) => /[\u3131-\u318E\uAC00-\uD7A3]/.test(text)
  let posts = rawPosts.filter(post => {
    const textSample = `${post.headline || ''} ${post.content || ''}`
    const isKo = hasKoreanChar(textSample)
    return locale === 'en' ? !isKo : isKo
  })

  const now = Date.now()
  posts = posts.filter(post => 
    post.status !== 'rejected' && 
    post.status !== 'pending_review' && 
    post.status !== 'pending_publish' && 
    new Date(post.created_at).getTime() <= now
  )

  if (badge || feed === 'reporter' || feed === 'blogger') {
    const targetBadge = badge || (feed === 'blogger' ? 'blogger' : 'reporter')
    posts = posts.filter(post => post.accounts?.badges?.includes(targetBadge))
  }

  if (category && category !== 'all') {
    posts = posts.filter(post => ((post as any).category === category || post.accounts?.category === category))
  }

  if (feed === 'foryou') {
    const msInDay = 1000 * 60 * 60 * 24
    posts.forEach(post => {
      let score = 0;
      const ageDays = (now - new Date(post.created_at).getTime()) / msInDay;
      if (ageDays < 7) score += Math.max(0, 50 - (ageDays * 7));
      score += (post.comments_count || 0) * 5;
      score += (post.views_count || 0) * 0.5;
      score += (post.reactions?.length || 0) * 2;
      if (user && followedIds.includes(post.author_id)) score += 100;
      (post as any).score = score;
    });
    posts.sort((a, b) => ((b as any).score || 0) - ((a as any).score || 0));
  }

  return posts.slice(offset, offset + limit)
}
