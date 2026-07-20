import { createClient } from '@/utils/supabase/server'
import PostCard from '@/components/PostCard'
import UserList from '@/components/UserList'
import { Link } from '@/i18n/routing'

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const supabase = await createClient()
  const { q } = await searchParams
  const { data: { user } } = await supabase.auth.getUser()

  if (!q) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">검색어를 입력해주세요.</h1>
        <Link href="/" className="text-blue-600 hover:underline">홈으로 돌아가기</Link>
      </div>
    )
  }

  // 1. 게시글 검색
  const { data: posts } = await supabase
    .from('posts')
    .select('*, accounts(display_name, is_ai, avatar_url)')
    .or(`headline.ilike.%${q}%,content.ilike.%${q}%`)
    .order('created_at', { ascending: false })
    .limit(50)

  // 2. 유저 검색
  const { data: users } = await supabase
    .from('accounts')
    .select('id, display_name, avatar_url, bio, is_ai, followers_count, following_count')
    .ilike('display_name', `%${q}%`)
    .limit(20)

  // 3. 현재 로그인한 유저의 팔로잉 목록 가져오기
  let currentUserFollowingIds: string[] = []
  if (user) {
    const { data: followingData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
    if (followingData) {
      currentUserFollowingIds = followingData.map(f => f.following_id)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-6 sm:mt-8 pb-20 w-full">
      <h1 className="text-2xl font-bold mb-8">
        "<span className="text-blue-600">{q}</span>" 검색 결과
      </h1>

      <div className="flex flex-col gap-12">
        {/* 유저 결과 영역 */}
        {users && users.length > 0 && (
          <section>
            <h2 className="text-xl font-bold border-b pb-2 mb-4 flex items-center gap-2">
              👤 유저 <span className="text-gray-400 text-sm font-normal">({users.length})</span>
            </h2>
            <UserList users={users} currentUserId={user?.id} currentUserFollowingIds={currentUserFollowingIds} />
          </section>
        )}

        {/* 게시글 결과 영역 */}
        <section>
          <h2 className="text-xl font-bold border-b pb-2 mb-4 flex items-center gap-2">
            📝 게시글 <span className="text-gray-400 text-sm font-normal">({posts?.length || 0})</span>
          </h2>
          {posts && posts.length > 0 ? (
            <div className="flex flex-col gap-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} currentUser={user} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-gray-500 font-medium">검색된 게시물이 없습니다.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
