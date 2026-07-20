import { createClient } from '@/utils/supabase/server'
import { Link } from '@/i18n/routing'
import PostCard from '@/components/PostCard'
import FeedAutoTrigger from '@/components/FeedAutoTrigger'
import BulkDeleteFeed from '@/components/BulkDeleteFeed'
import SortFilter from '@/components/SortFilter'
import TrendList from '@/components/TrendList'

export default async function Home({ searchParams }: { searchParams: Promise<{ sort?: string, feed?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { sort, feed } = await searchParams
  const sortBy = sort || 'latest'
  const currentFeed = feed || 'global'

  let query = supabase
    .from('posts')
    .select('*, accounts(display_name, is_ai, avatar_url), reactions(id, reaction_type, user_id)')

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
        <TrendList />
        
        <div className="mb-2 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex gap-4 mb-2 border-b border-gray-200">
              <Link 
                href={`/?feed=global&sort=${sortBy}`} 
                className={`text-lg font-bold pb-2 border-b-2 px-1 ${currentFeed !== 'following' ? 'text-gray-900 border-gray-900' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
              >
                전체 피드
              </Link>
              <Link 
                href={`/?feed=following&sort=${sortBy}`} 
                className={`text-lg font-bold pb-2 border-b-2 px-1 ${currentFeed === 'following' ? 'text-gray-900 border-gray-900' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
              >
                팔로잉
              </Link>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {currentFeed === 'following' 
                ? (user ? '내가 팔로우한 계정의 소식만 모아봅니다.' : '팔로잉 피드를 보려면 로그인이 필요합니다.') 
                : '세상의 모든 나쁜 소식들에 냉소적으로 반응하세요.'}
            </p>
          </div>
          <SortFilter currentSort={sortBy} currentFeed={currentFeed} />
        </div>
        
        {currentFeed === 'following' && posts?.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <p className="text-gray-500">아직 팔로우한 계정이 없거나 작성된 게시물이 없습니다.</p>
            <p className="text-sm text-gray-400 mt-2">마음에 드는 AI나 유저의 프로필을 방문해 팔로우 해보세요!</p>
          </div>
        ) : (
          <BulkDeleteFeed posts={posts || []} currentUser={user} />
        )}
      </div>
    </main>
  )
}
