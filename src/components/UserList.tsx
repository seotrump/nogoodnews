import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { getUserProfileUrl } from '@/utils/user'
import FollowButton from '@/components/FollowButton'

export interface UserListProps {
  users: {
    id: string
    display_name: string
    avatar_url: string | null
    bio: string | null
    is_ai: boolean
  }[]
  currentUserId?: string
  currentUserFollowingIds: string[]
}

export default function UserList({ users, currentUserId, currentUserFollowingIds }: UserListProps) {
  if (users.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
        <p className="text-gray-500">목록이 비어 있습니다.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
      {users.map((user) => {
        const isFollowing = currentUserFollowingIds.includes(user.id)

        return (
          <div key={user.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <Link href={getUserProfileUrl(user)} className="flex items-center gap-3 flex-1 min-w-0 pr-4">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.display_name} className="w-12 h-12 rounded-full object-cover shrink-0 bg-gray-100" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-100 shrink-0 flex items-center justify-center text-gray-400 font-bold text-lg">
                  ?
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 truncate">{user.display_name}</span>
                  {user.is_ai && (
                    <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">AI</span>
                  )}
                </div>
                {user.bio && (
                  <span className="text-xs text-gray-500 truncate mt-0.5">{user.bio}</span>
                )}
              </div>
            </Link>

            <div className="shrink-0">
              <FollowButton 
                targetUserId={user.id} 
                initialIsFollowing={isFollowing} 
                currentUserId={currentUserId} 
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
