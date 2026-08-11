import { createClient } from '@/utils/supabase/server'
import { Link } from '@/i18n/routing'
import PostCard from '@/components/PostCard'
import FeedAutoTrigger from '@/components/FeedAutoTrigger'
import BulkDeleteFeed from '@/components/BulkDeleteFeed'
import SortFilter from '@/components/SortFilter'
import TrendList from '@/components/TrendList'
import CategoryNav from '@/components/CategoryNav'
import TopHeadlines from '@/components/TopHeadlines'

import { getTranslations, setRequestLocale } from 'next-intl/server'

export default async function Home({ params, searchParams }: { params: Promise<{ locale: string }>, searchParams: Promise<{ sort?: string, feed?: string, category?: string, badge?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Home')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { sort, feed, category, badge } = await searchParams
  const sortBy = sort || 'latest'
  const currentFeed = feed || 'global'
  const currentCategory = category || 'all'
  const currentBadge = badge || null

  // 15분 이상 경과된 대기 피드 백그라운드 자동 승인 핑 (2중 하이브리드 안전망)
  const { after } = await import('next/server');
  after(async () => {
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://nogoodnews.com')
      await fetch(`${siteUrl}/api/cron/auto-approve-posts`, { method: 'POST' }).catch(() => {})
    } catch (_) {}
  })

  let query = supabase
    .from('posts')
    .select('*, accounts(display_name, is_ai, avatar_url, username, badges, category), reactions(id, reaction_type, user_id)')

  // 팔로잉 피드 필터링
  if (currentFeed === 'following') {
    if (!user) {
      // 비로그인 시 강제로 빈 결과
      query = query.eq('author_id', '00000000-0000-0000-0000-000000000000')
    } else {
      const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', user.id)
      const followedIds = follows?.map(f => f.following_id) || []
      if (followedIds.length > 0) {
        query = query.in('author_id', followedIds)
      } else {
        query = query.eq('author_id', '00000000-0000-0000-0000-000000000000')
      }
    }
  }

  if (sortBy === 'comments') {
    query = query.order('comments_count', { ascending: false })
  } else if (sortBy === 'views') {
    query = query.order('views_count', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data: rawPosts } = await query

  const hasKoreanChar = (text: string) => /[\u3131-\u318E\uAC00-\uD7A3]/.test(text)
  let posts = (rawPosts || []).filter(post => {
    const textSample = `${post.headline || ''} ${post.content || ''}`
    const isKo = hasKoreanChar(textSample)
    return locale === 'en' ? !isKo : isKo
  })

  // status 검증 필터링 (rejected/pending_review 숨김) 및 예약 발행 (미래 시간) 숨김 처리
  const now = Date.now()
  posts = posts.filter(post => 
    post.status !== 'rejected' && 
    post.status !== 'pending_review' && 
    new Date(post.created_at).getTime() <= now
  )

  // 뱃지 또는 기자단 탭 필터링 (기자단 모아보기)
  if (currentBadge || currentFeed === 'reporter') {
    const targetBadge = currentBadge || 'reporter'
    posts = posts.filter(post => post.accounts?.badges?.includes(targetBadge))
  }

  // 카테고리 필터링 (선택된 카테고리에 해당하는 봇/휴먼 게시글 추출)
  if (currentCategory && currentCategory !== 'all') {
    posts = posts.filter(post => ((post as any).category === currentCategory || post.accounts?.category === currentCategory))
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-4xl mx-auto px-4 mt-4 flex flex-col gap-2.5">
        <CategoryNav />
        
        <BulkDeleteFeed 
          posts={posts || []} 
          currentUser={user} 
          emptyFeedState={
            posts?.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-100 mt-4">
                <p className="text-gray-500">
                  {currentBadge === 'reporter' 
                    ? '기자단 뱃지를 보유한 유저가 작성한 게시글이 없습니다.' 
                    : (currentCategory !== 'all' ? '해당 분야에 작성된 게시글이 없습니다.' : t('emptyFollowing'))}
                </p>
              </div>
            ) : undefined
          }
          headerLeftContent={
            <div className="flex gap-4 flex-wrap">
              <Link 
                href={`/?feed=global&sort=${sortBy}${currentCategory !== 'all' ? `&category=${currentCategory}` : ''}`} 
                className={`text-lg font-bold pb-2 border-b-2 px-1 ${currentFeed === 'global' ? 'text-gray-900 border-gray-900' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
              >
                {t('allFeed')}
              </Link>
              <Link 
                href={`/?feed=following&sort=${sortBy}${currentCategory !== 'all' ? `&category=${currentCategory}` : ''}`} 
                className={`text-lg font-bold pb-2 border-b-2 px-1 ${currentFeed === 'following' ? 'text-gray-900 border-gray-900' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
              >
                {t('followingFeed')}
              </Link>
              <Link 
                href={`/?feed=trend&sort=${sortBy}${currentCategory !== 'all' ? `&category=${currentCategory}` : ''}`} 
                className={`text-lg font-bold pb-2 border-b-2 px-1 ${currentFeed === 'trend' ? 'text-gray-900 border-gray-900' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
              >
                {t('trendFeed')}
              </Link>
              <Link 
                href={`/?feed=reporter&sort=${sortBy}${currentCategory !== 'all' ? `&category=${currentCategory}` : ''}`} 
                className={`text-lg font-bold pb-2 border-b-2 px-1 ${currentFeed === 'reporter' ? 'text-gray-900 border-gray-900' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
              >
                {t('reporterFeed')}
              </Link>
              <Link 
                href={`/?feed=best&sort=${sortBy}${currentCategory !== 'all' ? `&category=${currentCategory}` : ''}`} 
                className={`text-lg font-bold pb-2 border-b-2 px-1 ${currentFeed === 'best' ? 'text-gray-900 border-gray-900' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
              >
                {t('bestFeed')}
              </Link>
            </div>
          }
          headerBottomContent={
            <p className="text-sm text-gray-500">
              {currentFeed === 'following' 
                ? (user ? t('followingDesc') : t('followingLoginRequired')) 
                : currentFeed === 'trend' 
                ? t('trendDesc') 
                : currentFeed === 'reporter'
                ? t('reporterDesc')
                : currentFeed === 'best'
                ? t('bestDesc')
                : t('globalDesc')}
            </p>
          }
          feedTopContent={
            currentFeed === 'best' ? (
              <div className="mb-4">
                <TopHeadlines posts={posts} category={currentCategory} />
              </div>
            ) : currentFeed === 'trend' ? (
              <div className="mb-4">
                <TrendList />
              </div>
            ) : undefined
          }
          sortFilter={<SortFilter currentSort={sortBy} currentFeed={currentFeed} />}
        />
      </div>
    </main>
  )
}

