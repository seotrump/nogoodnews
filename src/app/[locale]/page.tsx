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
import { getFeedPosts } from '@/app/feed-actions'

import { getTranslations, setRequestLocale } from 'next-intl/server'

export default async function Home({ params, searchParams }: { params: Promise<{ locale: string }>, searchParams: Promise<{ sort?: string, feed?: string, category?: string, badge?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Home')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { isAdmin } = await import('@/utils/auth')
  if (user && isAdmin(user) && locale !== 'ko') {
    const { redirect } = await import('next/navigation')
    redirect('/ko')
  }
  
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

  const recommendedUsers = await getRecommendedUsers(10)

  // 최적화된 서버 액션(RPC 또는 오버페치+페이지네이션)으로 최초 20개만 로드
  const posts = await getFeedPosts({
    page: 1,
    limit: 20,
    feed: currentFeed,
    sort: sortBy,
    category: currentCategory,
    badge: currentBadge,
    locale: locale
  })

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-6xl mx-auto px-4 mt-4 lg:grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="flex flex-col gap-2.5">
          <CategoryNav />
          
          <FollowRecommendationWidget users={recommendedUsers} currentUserId={user?.id} isMobile={true} />
          
          <BulkDeleteFeed 
            initialPosts={posts || []} 
            currentUser={user}
            feedType={currentFeed}
            sortBy={sortBy}
            currentCategory={currentCategory}
            currentBadge={currentBadge}
            locale={locale} 
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
                className={`text-lg font-bold pb-2 border-b-2 px-1 flex items-center gap-1 ${currentFeed === 'following' ? 'text-gray-900 border-gray-900' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
              >
                <span>{t('followingFeed')}</span>
                <span className="text-yellow-500 text-sm" title="내가 좋아하는 사람들의 글">★</span>
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
                href={`/?feed=blogger&sort=${sortBy}${currentCategory !== 'all' ? `&category=${currentCategory}` : ''}`} 
                className={`text-lg font-bold pb-2 border-b-2 px-1 ${currentFeed === 'blogger' ? 'text-gray-900 border-gray-900' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
              >
                {t('bloggerFeed')}
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
                 : currentFeed === 'blogger'
                 ? t('bloggerDesc')
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
            ) : currentFeed === 'following' && recommendedUsers && recommendedUsers.length > 0 ? (
              <div className="mb-4 bg-gradient-to-r from-pink-50 to-purple-50 p-4 rounded-xl border border-pink-100 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {recommendedUsers[0].avatar_url ? (
                      <img src={recommendedUsers[0].avatar_url} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-pink-200 border-2 border-white shadow-sm flex items-center justify-center text-lg">🤖</div>
                    )}
                    <span className="absolute -bottom-1 -right-1 bg-pink-500 text-white text-[10px] px-1 rounded-full border border-white">추천</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1">
                      오늘의 인연 <span className="text-pink-500">💕</span>
                    </h4>
                    <p className="text-xs text-gray-600">나와 궁합이 잘 맞는 <span className="font-bold text-gray-800">{recommendedUsers[0].display_name}</span>님을 만나보세요!</p>
                  </div>
                </div>
                <Link href={`/users/${(recommendedUsers[0] as any).username ? '@' + (recommendedUsers[0] as any).username : recommendedUsers[0].id}`} className="bg-white border border-pink-200 text-pink-600 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-pink-50 transition whitespace-nowrap">
                  프로필 보기
                </Link>
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

