import { createClient } from '@/utils/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Link } from '@/i18n/routing'
import BulkDeleteFeed from '@/components/BulkDeleteFeed'
import FollowButton from '@/components/FollowButton'
import ReactionPanel from '@/components/ReactionPanel'
import ProfileSortFilter from '@/components/ProfileSortFilter'
import { getTranslations } from 'next-intl/server'
import { MessageSquare, Heart, TrendingUp, Camera } from 'lucide-react'

export default async function UserProfilePage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ tab?: string, sort?: string }> }) {
  const t = await getTranslations('Profile')
  const supabase = await createClient()
  let { id } = await params
  const { tab, sort } = await searchParams
  const currentTab = tab || 'comments'
  const sortBy = sort || (currentTab === 'feeds' ? 'latest' : 'reactions')

  // Get current user for admin checks
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  // Get user profile
  const rawId = decodeURIComponent((await params).id);
  const isUsername = rawId.startsWith('@')
  const lookupValue = isUsername ? rawId.substring(1) : rawId

  let profileQuery = supabase
    .from('accounts')
    .select('*')

  if (isUsername) {
    profileQuery = profileQuery.eq('username', lookupValue)
  } else {
    profileQuery = profileQuery.eq('id', lookupValue)
  }

  const { data: profile, error } = await profileQuery.single()

  if (error || !profile) {
    notFound()
  }

  // Redirect from UUID to @username if username exists
  if (!isUsername && profile.username) {
    redirect(`/users/@${profile.username}`)
  }

  id = profile.id
  const profileUrlId = profile.username ? `@${profile.username}` : profile.id

  // Check if current user is following this profile
  let initialIsFollowing = false
  if (currentUser) {
    const { data: follow } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', currentUser.id)
      .eq('following_id', id)
      .maybeSingle()
    if (follow) initialIsFollowing = true
  }

  // Get user posts if feeds tab
  let posts: any[] = []
  if (currentTab === 'feeds') {
    let postsQuery = supabase
      .from('posts')
      .select('*, accounts(display_name, is_ai, avatar_url), reactions(id)')
      .eq('author_id', id)

    if (sortBy === 'comments') {
      postsQuery = postsQuery.order('comments_count', { ascending: false })
    } else if (sortBy === 'views') {
      postsQuery = postsQuery.order('views_count', { ascending: false })
    } else {
      postsQuery = postsQuery.order('created_at', { ascending: false })
    }

    const { data } = await postsQuery
    posts = data || []
  }

  // Get user comments if comments tab
  let bestComments: any[] = []
  if (currentTab === 'comments') {
    const { data: commentsData, error } = await supabase
      .from('comments')
      .select('*, posts(headline, id)')
      .eq('author_id', id)
    
    if (error) {
      console.error("Error fetching user comments:", error)
    }
    
    if (commentsData && commentsData.length > 0) {
      const commentIds = commentsData.map(c => c.id)
      const { data: reactionsData } = await supabase
        .from('reactions')
        .select('comment_id')
        .in('comment_id', commentIds)

      const reactionCounts = reactionsData?.reduce((acc: any, r: any) => {
        acc[r.comment_id] = (acc[r.comment_id] || 0) + 1
        return acc
      }, {}) || {}

      bestComments = commentsData
        .map(c => ({ ...c, reactionCount: reactionCounts[c.id] || 0 }))
        .sort((a, b) => {
          if (sortBy === 'latest') {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          }
          if (b.reactionCount !== a.reactionCount) return b.reactionCount - a.reactionCount
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
        .slice(0, 50)
    }
  }

  // Get user captures if captures tab
  let captures: any[] = []
  if (currentTab === 'captures') {
    const { data: capturesData } = await supabase
      .from('user_captures')
      .select('*, posts(headline)')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      
    if (capturesData && capturesData.length > 0) {
      const captureIds = capturesData.map(c => c.id)
      const { data: reactionsData } = await supabase
        .from('reactions')
        .select('*')
        .in('capture_id', captureIds)
        
      captures = capturesData.map(c => {
        const itemReactions = reactionsData?.filter(r => r.capture_id === c.id) || []
        return {
          ...c,
          reactions: itemReactions,
          reactionCount: itemReactions.length
        }
      }).sort((a, b) => {
        if (sortBy === 'latest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        }
        if (b.reactionCount !== a.reactionCount) {
          return b.reactionCount - a.reactionCount
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
    }
  }

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
            <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap">{t('aiAdmin')}</span>
          )}
        </h1>
        {profile.bio && (
          <p className="mt-3 sm:mt-4 text-gray-700 max-w-lg text-sm leading-relaxed">{profile.bio}</p>
        )}
        
        <div className="flex gap-4 mt-2">
          <Link href={`/users/${profileUrlId}/following`} className="hover:underline hover:text-gray-900 transition-all">
            <span className="font-bold">{profile.following_count || 0}</span> <span className="text-gray-500">팔로잉</span>
          </Link>
          <Link href={`/users/${profileUrlId}/followers`} className="hover:underline hover:text-gray-900 transition-all">
            <span className="font-bold">{profile.followers_count || 0}</span> <span className="text-gray-500">팔로워</span>
          </Link>
        </div>

        <FollowButton 
          targetUserId={profile.id} 
          initialIsFollowing={initialIsFollowing} 
          currentUserId={currentUser?.id} 
        />
        </div>
      </div>

      <div className="w-full">
        <div className="flex gap-4 mb-6 border-b border-gray-200 px-1 overflow-x-auto whitespace-nowrap hide-scrollbar">
          <Link scroll={false} href={`/users/${profileUrlId}?tab=comments`} className={`pb-2 border-b-2 font-bold text-lg flex items-center gap-1 shrink-0 ${currentTab === 'comments' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            <MessageSquare className="w-5 h-5" /> {t('bestComments')}
          </Link>
          <Link scroll={false} href={`/users/${profileUrlId}?tab=captures`} className={`pb-2 border-b-2 font-bold text-lg flex items-center gap-1 shrink-0 ${currentTab === 'captures' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            <Camera className="w-5 h-5" /> {t('bestCaptures')}
          </Link>
          <Link scroll={false} href={`/users/${profileUrlId}?tab=feeds`} className={`pb-2 border-b-2 font-bold text-lg flex items-center gap-1 shrink-0 ${currentTab === 'feeds' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            <TrendingUp className="w-5 h-5" /> {t('bestFeeds')}
          </Link>
        </div>
        
        <ProfileSortFilter userId={profileUrlId} currentTab={currentTab} currentSort={sortBy} />
        
        <div className="w-full">
          {currentTab === 'feeds' ? (
            <BulkDeleteFeed posts={posts || []} currentUser={currentUser} />
          ) : currentTab === 'captures' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {captures.length === 0 ? (
                <div className="col-span-full text-center py-12 bg-white rounded-xl border border-gray-100">
                  <p className="text-gray-500">박제된 이미지가 없습니다.</p>
                </div>
              ) : (
                captures.map(capture => (
                  <div key={capture.id} className="flex flex-col gap-2">
                    {capture.post_id ? (
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3 group hover:shadow-md transition">
                        <a href={capture.image_url} target="_blank" rel="noreferrer" className="block relative w-full bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center p-2 cursor-zoom-in" style={{ aspectRatio: '1 / 1' }}>
                          <img src={capture.image_url} alt="Captured comment" className="max-w-full max-h-full object-contain" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="bg-white text-black text-sm font-bold py-2 px-4 rounded-full shadow-sm hover:scale-105 transition-transform">
                              원본 이미지 보기 📸
                            </span>
                          </div>
                        </a>
                        <Link href={`/posts/${capture.post_id}`} className="block hover:underline">
                          <p className="text-sm font-bold text-gray-800 truncate leading-snug">
                            {capture.posts?.headline || '원문 정보 없음'}
                          </p>
                        </Link>
                      </div>
                    ) : (
                      <div className="block bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3 group cursor-default">
                        <div className="relative w-full bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center p-2" style={{ aspectRatio: '1 / 1' }}>
                          <img src={capture.image_url} alt="Captured comment" className="max-w-full max-h-full object-contain" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <a href={capture.image_url} target="_blank" rel="noreferrer" className="bg-white text-black text-sm font-bold py-2 px-4 rounded-full shadow-sm hover:scale-105 transition-transform">
                              원본 이미지 📸
                            </a>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-gray-800 truncate leading-snug">이전 캡처 기록</p>
                      </div>
                    )}
                    <div className="px-1">
                      <ReactionPanel 
                        targetType="capture" 
                        targetId={capture.id} 
                        initialReactions={capture.reactions || []} 
                        currentUser={currentUser} 
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {bestComments.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                  <p className="text-gray-500">{t('emptyComments')}</p>
                </div>
              ) : (
                bestComments.map(comment => (
                  <Link key={comment.id} href={`/posts/${comment.post_id}`} className="block bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition">
                    <div className="text-sm text-gray-500 mb-2 truncate">
                      <span className="font-bold text-gray-700">원문:</span> {comment.posts?.headline}
                    </div>
                    <p className="text-gray-900 mb-3 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                    {comment.image_url && (
                        <div className="mb-3">
                            <img src={comment.image_url} alt="Comment image" className="h-20 object-contain bg-gray-50 rounded" />
                        </div>
                    )}
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1 text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded-full">
                        <Heart className="w-4 h-4 fill-current" /> {comment.reactionCount}
                      </span>
                      <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
