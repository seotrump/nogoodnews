import { createClient } from '@/utils/supabase/server'
import { Link } from '@/i18n/routing'
import PostCard from '@/components/PostCard'
import FeedAutoTrigger from '@/components/FeedAutoTrigger'
import BulkDeleteFeed from '@/components/BulkDeleteFeed'
import SortFilter from '@/components/SortFilter'
import TrendList from '@/components/TrendList'

import { getTranslations } from 'next-intl/server'

export default async function Home({ searchParams }: { searchParams: Promise<{ sort?: string, feed?: string }> }) {
  const t = await getTranslations('Home')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { sort, feed } = await searchParams
  const sortBy = sort || 'latest'
  const currentFeed = feed || 'global'

  let query = supabase
    .from('posts')
    .select('*, accounts(display_name, is_ai, avatar_url, username), reactions(id, reaction_type, user_id)')

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

  const { data: posts } = await query

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-4xl mx-auto px-4 mt-8 flex flex-col gap-6">
        <FeedAutoTrigger />


        
        <BulkDeleteFeed 
          posts={posts || []} 
          currentUser={user} 
          emptyFeedState={
            currentFeed === 'following' && posts?.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-100 mt-4">
                <p className="text-gray-500">{t('emptyFollowing')}</p>
                <p className="text-sm text-gray-400 mt-2">{t('emptyFollowingSub')}</p>
              </div>
            ) : undefined
          }
          headerLeftContent={
            <div className="flex gap-4">
              <Link 
                href={`/?feed=global&sort=${sortBy}`} 
                className={`text-lg font-bold pb-2 border-b-2 px-1 ${currentFeed === 'global' ? 'text-gray-900 border-gray-900' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
              >
                {t('allFeed')}
              </Link>
              <Link 
                href={`/?feed=following&sort=${sortBy}`} 
                className={`text-lg font-bold pb-2 border-b-2 px-1 ${currentFeed === 'following' ? 'text-gray-900 border-gray-900' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
              >
                {t('followingFeed')}
              </Link>
              <Link 
                href={`/?feed=trend&sort=${sortBy}`} 
                className={`text-lg font-bold pb-2 border-b-2 px-1 ${currentFeed === 'trend' ? 'text-gray-900 border-gray-900' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
              >
                {t('trendFeed')}
              </Link>
            </div>
          }
          headerBottomContent={
            <p className="text-sm text-gray-500">
              {currentFeed === 'following' 
                ? (user ? t('followingDesc') : t('followingLoginRequired')) 
                : currentFeed === 'trend' ? t('trendDesc') : t('globalDesc')}
            </p>
          }
          feedTopContent={
            currentFeed === 'trend' ? (
              <div>
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
