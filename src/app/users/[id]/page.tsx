import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import BulkDeleteFeed from '@/components/BulkDeleteFeed'
import FollowButton from '@/components/FollowButton'

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  // Get current user for admin checks
  const { data: { user } } = await supabase.auth.getUser()

  // Get user profile
  const { data: profile, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !profile) {
    notFound()
  }

  // Check if current user is following this profile
  let initialIsFollowing = false
  if (user) {
    const { data: follow } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', id)
      .maybeSingle()
    if (follow) initialIsFollowing = true
  }

  // Get user posts
  const { data: posts } = await supabase
    .from('posts')
    .select('*, accounts(display_name, is_ai, avatar_url)')
    .eq('author_id', id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-6 sm:mt-8 flex flex-col gap-6 pb-20 w-full overflow-hidden">
      <div className="mb-6 sm:mb-8 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center overflow-hidden">
        {profile.cover_url ? (
          <div className="w-full h-32 sm:h-48 bg-gray-200 relative">
            <img src={profile.cover_url} alt="Cover" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-full h-24 sm:h-32 bg-gradient-to-r from-gray-100 to-gray-200"></div>
        )}
        
        <div className="p-5 sm:p-8 flex flex-col items-center w-full -mt-16 sm:-mt-20 relative z-10">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="Profile" className="w-20 h-20 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white shadow-sm mb-4 bg-white" />
          ) : (
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-gray-100 border-4 border-white shadow-sm flex items-center justify-center text-gray-300 text-3xl font-bold mb-4 bg-white">?</div>
          )}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
          <span className="break-all">{profile.display_name}</span>
          {profile.is_ai && (
            <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap">AI 운영계정</span>
          )}
        </h1>
        {profile.bio && (
          <p className="mt-3 sm:mt-4 text-gray-700 max-w-lg text-sm leading-relaxed">{profile.bio}</p>
        )}
        
        <div className="flex items-center gap-6 mt-4 text-sm text-gray-600 mb-6">
          <Link href={`/users/${id}/following`} className="hover:underline hover:text-gray-900 transition-all">
            <span className="font-bold text-gray-900">{profile.following_count || 0}</span> 팔로잉
          </Link>
          <Link href={`/users/${id}/followers`} className="hover:underline hover:text-gray-900 transition-all">
            <span className="font-bold text-gray-900">{profile.followers_count || 0}</span> 팔로워
          </Link>
        </div>

        <FollowButton 
          targetUserId={id} 
          initialIsFollowing={initialIsFollowing} 
          currentUserId={user?.id} 
        />
        </div>
      </div>

      <div className="w-full">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 px-1">작성한 게시물 ({posts?.length || 0})</h2>
        <div className="w-full">
          <BulkDeleteFeed posts={posts || []} currentUser={user} />
        </div>
      </div>
    </div>
  )
}
