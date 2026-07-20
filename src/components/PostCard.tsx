import Link from 'next/link'
import { isAdmin } from '@/utils/auth'
import DeletePostButton from './DeletePostButton'
import { Eye, MessageSquare } from 'lucide-react'

import ReactionPanel from './ReactionPanel'

export default function PostCard({ post, isDetail = false, currentUser, hideDeleteButton = false }: { post: any, isDetail?: boolean, currentUser?: any, hideDeleteButton?: boolean }) {
  const date = new Date(post.created_at).toLocaleString('ko-KR')
  const authorName = post.accounts?.display_name || '익명'
  const isAI = post.accounts?.is_ai
  const avatarUrl = post.accounts?.avatar_url

  const renderWithHashtags = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(#[\w가-힣]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        const tag = part.slice(1);
        return <Link key={i} href={`/tags/${encodeURIComponent(tag)}`} className="text-blue-600 hover:underline">{part}</Link>;
      }
      return part;
    });
  }

  const contentNode = (
    <div className="mt-1">
      <h2 className="text-xl font-bold text-gray-900 mb-2 leading-tight">
        {!isDetail ? (
          <Link href={`/posts/${post.id}`} className="hover:text-blue-600 transition">
            {renderWithHashtags(post.headline)}
          </Link>
        ) : (
          renderWithHashtags(post.headline)
        )}
      </h2>
      <p className={`text-gray-700 whitespace-pre-wrap text-sm leading-relaxed ${!isDetail ? 'line-clamp-2' : ''}`}>
        {renderWithHashtags(post.content)}
      </p>
    </div>
  )

  return (
    <div className="relative bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
      {isAdmin(currentUser) && !hideDeleteButton && (
        <DeletePostButton postId={post.id} isDetail={isDetail} />
      )}

      {post.url && (
        <a href={post.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-500 hover:underline mb-3 block truncate bg-blue-50 px-2 py-1 rounded w-full pr-12">
          🔗 원문 보러가기: {post.url}
        </a>
      )}
      
      <div className="mb-4 pr-10">
        {contentNode}
      </div>

      <div className="mb-4">
        <ReactionPanel 
          targetType="post" 
          targetId={post.id} 
          initialReactions={post.reactions || []} 
          currentUserId={currentUser?.id} 
        />
      </div>

      <div className="text-xs text-gray-400 flex items-center justify-between border-t pt-3 mt-2">
        <div className="flex items-center gap-2">
          <Link href={`/users/${post.author_id}`} className="flex items-center gap-2 font-semibold text-gray-600 hover:text-black hover:underline">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-5 h-5 rounded-full object-cover border" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gray-200 border flex items-center justify-center text-[8px] text-gray-400">?</div>
            )}
            <span>{authorName}</span>
          </Link>
        </div>
        <div className="flex items-center gap-4 text-gray-500 font-medium">
          <div className="flex items-center gap-1" title="조회수">
            <Eye className="w-3.5 h-3.5" />
            <span>{post.views_count || 0}</span>
          </div>
          <div className="flex items-center gap-1" title="댓글수">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{post.comments_count || 0}</span>
          </div>
          <span className="text-gray-400 font-normal">{date}</span>
          {isDetail && currentUser && (post.author_id === currentUser.id || isAdmin(currentUser)) && (
            <Link href={`/posts/${post.id}/edit`} className="ml-1 text-blue-500 hover:text-blue-700 font-bold transition">
              수정
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
