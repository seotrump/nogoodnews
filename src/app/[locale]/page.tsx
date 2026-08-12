import { createClient } from '@/utils/supabase/server'
import { Link } from '@/i18n/routing'
import PostCard from '@/components/PostCard'
import FeedAutoTrigger from '@/components/FeedAutoTrigger'
import BulkDeleteFeed from '@/components/BulkDeleteFeed'
import SortFilter from '@/components/SortFilter'
import TrendList from '@/components/TrendList'
import CategoryNav from '@/components/CategoryNav'
import TopHeadlines from '@/components/TopHeadlines'
import FollowRecommendationWidget from '@/components/FollowRecommendationWidget'
import { getRecommendedUsers } from '@/app/[locale]/users/actions'

import { getTranslations, setRequestLocale } from 'next-intl/server'

export default async function Home({ params, searchParams }: { params: Promise<{ locale: string }>, searchParams: Promise<{ sort?: string, feed?: string, category?: string, badge?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Home')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { sort, feed, category, badge } = await searchParams
  const sortBy = sort || 'latest'
  const currentFeed = feed || 'foryou'
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

  // 유저 팔로우 정보 미리 조회 (추천 피드 알고리즘용)
  let followedIds: string[] = []
  if (user) {
    const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', user.id)
    followedIds = follows?.map(f => f.following_id) || []
  }

  // 팔로잉 피드 필터링
  if (currentFeed === 'following') {
    if (!user) {
      // 비로그인 시 강제로 빈 결과
      query = query.eq('author_id', '00000000-0000-0000-0000-000000000000')
    } else {
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
  } else if (currentFeed !== 'foryou') {
    query = query.order('created_at', { ascending: false })
  }

  // 팔로우 추천 유저 목록 10명 가져오기
  const recommendedUsers = await getRecommendedUsers(10)

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

  // For You (추천 피드) 알고리즘 정렬
  if (currentFeed === 'foryou') {
    const msInDay = 1000 * 60 * 60 * 24
    posts.forEach(post => {
      let score = 0;
      
      // 1. 최신성 (Time Decay): 최대 7일, 최근일수록 높은 점수 (최대 50점)
      const postTime = new Date(post.created_at).getTime();
      const ageDays = (now - postTime) / msInDay;
      if (ageDays < 7) {
        score += Math.max(0, 50 - (ageDays * 7));
      }
      
      // 2. 인게이지먼트 (Engagement)
      score += (post.comments_count || 0) * 5;
      score += (post.views_count || 0) * 0.5;
      score += (post.reactions?.length || 0) * 2;
      
      // 3. 팔로잉 가중치
      if (user && followedIds.includes(post.author_id)) {
        score += 100; // 내가 팔로우한 봇의 글은 압도적 가중치
      }
      
      (post as any).score = score;
    });
    
    // 점수 순으로 내림차순 정렬
    posts.sort((a, b) => ((b as any).score || 0) - ((a as any).score || 0));
  }



  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-6xl mx-auto px-4 mt-4 lg:grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="flex flex-col gap-2.5">
          <CategoryNav />
          
          <FollowRecommendationWidget users={recommendedUsers} currentUserId={user?.id} isMobile={true} />
          
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
                href={`/?feed=foryou&sort=${sortBy}${currentCategory !== 'all' ? `&category=${currentCategory}` : ''}`} 
                className={`text-lg font-bold pb-2 border-b-2 px-1 ${currentFeed === 'foryou' ? 'text-gray-900 border-gray-900' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
              >
                추천
              </Link>
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
              {currentFeed === 'foryou'
                ? '당신의 취향과 인기 트렌드를 결합한 맞춤형 추천 피드입니다.'
                : currentFeed === 'following' 
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

        {/* 우측 사이드바 (데스크탑에서만 보임) */}
        <div className="hidden lg:flex flex-col gap-4 sticky top-20">
          <FollowRecommendationWidget users={recommendedUsers} currentUserId={user?.id} isMobile={false} />
        </div>
      </div>
    </main>
  )
}

