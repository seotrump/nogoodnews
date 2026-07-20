import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import PostCard from '@/components/PostCard'
import CommentForm from '@/components/CommentForm'
import AiTrigger from '@/components/AiTrigger'
import { isAdmin } from '@/utils/auth'
import DeletePostButton from '@/components/DeletePostButton'
import RealtimeComments from '@/components/RealtimeComments' // 새로 만든 컴포넌트 불러오기

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { id } = await params

  const { data: post, error } = await supabase
    .from('posts')
    .select('*, accounts(display_name, is_ai, avatar_url), reactions(id, reaction_type, user_id)')
    .eq('id', id)
    .single()

  if (error || !post) {
    notFound()
  }

  // 조회수 1 증가
  await supabase.rpc('increment_views', { post_id: id })

  const { data: comments } = await supabase
    .from('comments')
    .select('*, accounts(display_name, is_ai, avatar_url), reactions(id, reaction_type, user_id)')
    .eq('post_id', id)
    .order('created_at', { ascending: true })

  const lastComment = comments?.[comments.length - 1]
  const lastCommentIsAi = lastComment ? !!lastComment.accounts?.is_ai : false
  const hasAdmin = isAdmin(user)

  return (
    <div className="max-w-4xl mx-auto px-4 mt-8 flex flex-col gap-6 pb-20 w-full overflow-hidden">
      {hasAdmin && (
        <div className="flex justify-end px-1">
          <DeletePostButton
            postId={post.id}
            isDetail={true}
            className="flex items-center gap-2 text-gray-500 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-gray-200 transition text-sm font-semibold"
          />
        </div>
      )}
      <PostCard post={post} isDetail={true} currentUser={user} hideDeleteButton={true} />

      <div className="mt-12 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <AiTrigger postId={post.id} commentCount={comments?.length || 0} lastCommentIsAi={lastCommentIsAi} />

        {/* 기존의 길었던 코드를 지우고, 실시간 컴포넌트로 교체합니다 */}
        <RealtimeComments postId={post.id} initialComments={comments || []} currentUser={user} />

        {user ? (
          <CommentForm postId={post.id} />
        ) : (
          <div className="mt-8 p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-sm text-gray-600">댓글을 작성하려면 로그인이 필요합니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}