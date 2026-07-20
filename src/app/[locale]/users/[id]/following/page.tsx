import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { Link } from '@/i18n/routing'
import UserList from '@/components/UserList'

export default async function FollowingPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  
  // Get current user and their followings
  const { data: { user } } = await supabase.auth.getUser()
  let currentUserFollowingIds: string[] = []
  if (user) {
    const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', user.id)
    if (follows) currentUserFollowingIds = follows.map(f => f.following_id)
  }

  // Get target profile
  const { data: profile } = await supabase.from('accounts').select('display_name, following_count').eq('id', id).single()
  if (!profile) notFound()

  // Get following: join follows with accounts
  const { data: followingRecords } = await supabase
    .from('follows')
    .select('created_at, accounts!follows_following_id_fkey(id, display_name, avatar_url, bio, is_ai)')
    .eq('follower_id', id)
    .order('created_at', { ascending: false })

  const following = followingRecords?.map(r => r.accounts).filter(Boolean) as any[] || []

  return (
    <div className="max-w-2xl mx-auto px-4 mt-8 pb-20">
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/users/${id}`} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{profile.display_name}</h1>
          <p className="text-sm text-gray-500">팔로잉 {profile.following_count}명</p>
        </div>
      </div>

      <UserList users={following} currentUserId={user?.id} currentUserFollowingIds={currentUserFollowingIds} />
    </div>
  )
}
