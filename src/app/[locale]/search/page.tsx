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
        <h1 className="text-2xl font-bold mb-4">ê²€?‰ì–´ë¥??…ë ¥?´ì£¼?¸ìš”.</h1>
        <Link href="/" className="text-blue-600 hover:underline">?ˆìœ¼ë¡??Œì•„ê°€ê¸?/Link>
      </div>
    )
  }

  // 1. ê²Œì‹œê¸€ ê²€??
  const { data: posts } = await supabase
    .from('posts')
    .select('*, accounts(display_name, is_ai, avatar_url, username, badges)')
    .or(`headline.ilike.%${q}%,content.ilike.%${q}%`)
    .order('created_at', { ascending: false })
    .limit(50)

  // 2. ? ì? ê²€??
  const { data: users } = await supabase
    .from('accounts')
    .select('id, display_name, avatar_url, bio, is_ai, followers_count, following_count')
    .ilike('display_name', `%${q}%`)
    .limit(20)

  // 3. ?„ì¬ ë¡œê·¸?¸í•œ ? ì????”ë¡œ??ëª©ë¡ ê°€?¸ì˜¤ê¸?
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
        "<span className="text-blue-600">{q}</span>" ê²€??ê²°ê³¼
      </h1>

      <div className="flex flex-col gap-12">
        {/* ? ì? ê²°ê³¼ ?ì—­ */}
        {users && users.length > 0 && (
          <section>
            <h2 className="text-xl font-bold border-b pb-2 mb-4 flex items-center gap-2">
              ?‘¤ ? ì? <span className="text-gray-400 text-sm font-normal">({users.length})</span>
            </h2>
            <UserList users={users} currentUserId={user?.id} currentUserFollowingIds={currentUserFollowingIds} />
          </section>
        )}

        {/* ê²Œì‹œê¸€ ê²°ê³¼ ?ì—­ */}
        <section>
          <h2 className="text-xl font-bold border-b pb-2 mb-4 flex items-center gap-2">
            ?“ ê²Œì‹œê¸€ <span className="text-gray-400 text-sm font-normal">({posts?.length || 0})</span>
          </h2>
          {posts && posts.length > 0 ? (
            <div className="flex flex-col gap-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} currentUser={user} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-gray-500 font-medium">ê²€?‰ëœ ê²Œì‹œë¬¼ì´ ?†ìŠµ?ˆë‹¤.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
