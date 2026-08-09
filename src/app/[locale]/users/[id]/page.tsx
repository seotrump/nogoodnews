import { createClient } from '@/utils/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Link } from '@/i18n/routing'
import BulkDeleteFeed from '@/components/BulkDeleteFeed'
import FollowButton from '@/components/FollowButton'
import ReactionPanel from '@/components/ReactionPanel'
import ProfileSortFilter from '@/components/ProfileSortFilter'
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server'
import UserBadge from '@/components/UserBadge'
import { MessageSquare, Heart, TrendingUp, Camera } from 'lucide-react'
import { getPointsForNextLevel } from '@/utils/gamification'
import { getExistenceCategoryLabel, getRealmCategoryLabel, getBotCategoryLabel } from '@/utils/type-code'


export const revalidate = 0

export default async function UserProfilePage({ params, searchParams }: { params: Promise<{ id: string, locale: string }>, searchParams: Promise<{ tab?: string, sort?: string }> }) {
  const t = await getTranslations('Profile')
  const supabase = await createClient()
  let { id, locale } = await params
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
    redirect(`/${locale}/users/@${profile.username}`)
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
      .select('*, accounts(display_name, is_ai, avatar_url, badges), reactions(id)')
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

  const xpData = getPointsForNextLevel(profile.points || 0)

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
          <span className="text-2xl sm:text-3xl leading-none">{['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][profile.level || 1] || `[${profile.level || 1}]`}</span>
          <span className="break-all">{profile.display_name}</span>
          {profile.is_ai && (
            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap">{t('aiAdmin')}</span>
          )}
        </h1>
        
        {!profile.is_ai && (
          <div className="w-full max-w-xs mt-3 flex flex-col items-center gap-1">
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${xpData.progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between w-full text-xs text-gray-500 font-medium px-1">
              <span>XP: {profile.points || 0}</span>
              {xpData.nextThreshold ? (
                <span>Next: {xpData.nextThreshold}</span>
              ) : (
                <span>MAX LEVEL</span>
              )}
            </div>
          </div>
        )}

        {profile.is_ai && profile.show_public_card !== false && (
          <div className="mt-4 w-full bg-gradient-to-br from-purple-900 via-indigo-900 to-black text-white rounded-3xl p-6 text-left shadow-xl border border-purple-700/50">
            {/* 1. 상단 타이틀 & NBTI 배지 */}
            <div className="flex items-center justify-between pb-3 border-b border-purple-700/60 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🤖</span>
                <div>
                  <h3 className="text-sm font-bold text-white">로봇 정체성 & 분석 프로필</h3>
                  <p className="text-[11px] text-purple-300 font-mono">Type Code: {profile.type_code || 'T2A2M2P2'}</p>
                </div>
              </div>
              {profile.show_nbti_badge !== false && (
                <span className="bg-purple-500 text-white font-mono font-black text-xs px-3 py-1 rounded-full shadow-md border border-purple-400">
                  🧠 NBTI: {profile.nbti_type || (profile.type_code ? `${profile.type_code.includes('P3') ? 'E' : 'I'}${profile.type_code.includes('T1') ? 'N' : 'S'}${profile.type_code.includes('A3') ? 'F' : 'T'}${profile.type_code.includes('M3') ? 'P' : 'J'}` : 'ENFP')}
                </span>
              )}
            </div>

            {/* 2. 존재 유형 & 소속 세계관 & 역할 & 전문분야 & 성별 (봇빌더 순서 나열) */}
            {profile.show_realm_info !== false && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 bg-purple-950/60 p-3.5 rounded-2xl border border-purple-800/80 text-xs">
                <div>
                  <span className="text-purple-400 font-bold">존재 유형</span>
                  <p className="text-white font-medium mt-0.5">
                    <strong className="text-purple-300">{getExistenceCategoryLabel(profile.existence_category, true)}</strong>
                    {profile.existence_detail ? ` (${profile.existence_detail})` : ''}
                  </p>
                </div>
                <div>
                  <span className="text-purple-400 font-bold">소속 / 거주지</span>
                  <p className="text-white font-medium mt-0.5">
                    <strong className="text-purple-300">{getRealmCategoryLabel(profile.realm_category, true)}</strong>
                    {profile.realm_detail ? ` (${profile.realm_detail})` : ''}
                  </p>
                </div>
                {profile.speech_style && (
                  <div className="sm:col-span-2 pt-2 border-t border-purple-800/50">
                    <span className="text-purple-400 font-bold">말투 및 톤</span>
                    <p className="text-purple-200 mt-0.5">{profile.speech_style}</p>
                  </div>
                )}
                {profile.role && (
                  <div>
                    <span className="text-purple-400 font-bold">전담 역할</span>
                    <p className="text-white font-medium mt-0.5">
                      {profile.role === 'feed_focused' ? '피드 전담 (Feed Only)' : profile.role === 'comment_focused' ? '댓글 전담 (Comment Only)' : '혼합 (Mixed 피드·댓글)'}
                    </p>
                  </div>
                )}
                {profile.category && (
                  <div>
                    <span className="text-purple-400 font-bold">전문 분야</span>
                    <p className="text-blue-300 font-medium mt-0.5">{getBotCategoryLabel(profile.category, true)}</p>
                  </div>
                )}
                {profile.gender && profile.gender !== 'unknown' && (
                  <div className="sm:col-span-2 pt-2 border-t border-purple-800/50">
                    <span className="text-purple-400 font-bold">성별</span>
                    <p className="text-white font-medium mt-0.5">
                      {profile.gender === 'male' ? '♂️ 남성' : profile.gender === 'female' ? '♀️ 여성' : '⚪ 중성/무관'}
                    </p>
                  </div>
                )}
              </div>
            )}


            {/* 3. 📜 페르소나 시스템 프롬프트 (스플릿/스크롤 없이 전체 노출) */}
            {profile.show_prompt !== false && profile.persona_prompt && (
              <div className="mb-4 pt-1">
                <span className="text-purple-300 font-bold text-xs block mb-1.5 flex items-center gap-1">
                  <span>📜</span> 페르소나 시스템 프롬프트 (System Prompt)
                </span>
                <div className="bg-black/80 text-green-400 p-4 rounded-xl font-mono text-[11px] leading-relaxed border border-purple-800/60 whitespace-pre-wrap break-words">
                  {profile.persona_prompt}
                </div>
              </div>
            )}

            {/* 4. 4대 판단축 (TAMP) 요약 바 */}


            <div className="space-y-2 text-xs pt-1">
              <span className="text-purple-300 font-bold block mb-1">🎯 4대 판단축 성향 매핑 (TAMP Axes)</span>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="bg-purple-950/40 p-2 rounded-xl border border-purple-800/50 flex justify-between">
                  <span className="text-gray-400">공격 대상(target):</span>
                  <span className="text-yellow-300 font-bold">{profile.axis_profile?.target ?? 5}점</span>
                </div>
                <div className="bg-purple-950/40 p-2 rounded-xl border border-purple-800/50 flex justify-between">
                  <span className="text-gray-400">애정 표현(affection):</span>
                  <span className="text-pink-300 font-bold">{profile.axis_profile?.affection ?? 5}점</span>
                </div>
                <div className="bg-purple-950/40 p-2 rounded-xl border border-purple-800/50 flex justify-between">
                  <span className="text-gray-400">표정 태도(mask):</span>
                  <span className="text-cyan-300 font-bold">{profile.axis_profile?.mask ?? 5}점</span>
                </div>
                <div className="bg-purple-950/40 p-2 rounded-xl border border-purple-800/50 flex justify-between">
                  <span className="text-gray-400">반응 속도(pace):</span>
                  <span className="text-green-300 font-bold">{profile.axis_profile?.pace ?? 5}점</span>
                </div>
              </div>
            </div>
          </div>
        )}


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
