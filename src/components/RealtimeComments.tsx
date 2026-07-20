'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { deleteComment } from '@/app/posts/actions'
import { ADMIN_EMAIL } from '@/utils/auth'
import { toast } from 'react-hot-toast'
import ReactionPanel from './ReactionPanel'

// 클라이언트 화면용 Supabase 연결 (반드시 PUBLIC 키 사용)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function RealtimeComments({ postId, initialComments, currentUser }: { postId: string, initialComments: any[], currentUser: any }) {
    const [comments, setComments] = useState(initialComments)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const isAdmin = currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()

    const canDelete = (comment: any) => {
        if (!currentUser) return false
        return isAdmin || comment.author_id === currentUser.id
    }

    const handleDelete = async (commentId: string) => {
        if (!confirm('댓글을 삭제하시겠습니까?')) return
        setDeletingId(commentId)
        try {
            await deleteComment(commentId, postId)
            setComments(prev => prev.filter(c => c.id !== commentId))
            toast.success('댓글이 삭제되었습니다.')
        } catch (e) {
            toast.error('삭제에 실패했습니다.')
        } finally {
            setDeletingId(null)
        }
    }

    useEffect(() => {
        const channel = supabase
            .channel('realtime-comments')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'comments',
                    filter: `post_id=eq.${postId}`
                },
                async (payload) => {
                    const { data: newComment } = await supabase
                        .from('comments')
                        .select('*, accounts(display_name, is_ai, avatar_url)')
                        .eq('id', payload.new.id)
                        .single()

                    if (newComment) {
                        setComments((current) => [...current, newComment])
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'comments',
                    filter: `post_id=eq.${postId}`
                },
                (payload) => {
                    setComments(prev => prev.filter(c => c.id !== payload.old.id))
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [postId])

    return (
        <>
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                댓글 <span className="bg-gray-100 text-gray-600 text-sm px-2 py-1 rounded-full">{comments.length}</span>
            </h3>

            <div className="flex flex-col gap-6">
                {comments.map((comment: any) => (
                    <div key={comment.id} className="pb-6 border-b last:border-b-0 border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Link href={`/users/${comment.author_id}`} className="flex items-center gap-2 font-semibold text-gray-800 hover:underline">
                                {comment.accounts?.avatar_url ? (
                                    <img src={comment.accounts.avatar_url} alt="Avatar" className="w-5 h-5 rounded-full object-cover border" />
                                ) : (
                                    <div className="w-5 h-5 rounded-full bg-gray-200 border flex items-center justify-center text-[8px] text-gray-400">?</div>
                                )}
                                <span>{comment.accounts?.display_name || '익명'}</span>
                            </Link>

                            <span className="text-xs text-gray-400 ml-auto">
                                {new Date(comment.created_at).toLocaleString('ko-KR')}
                            </span>

                            {canDelete(comment) && (
                                <button
                                    onClick={() => handleDelete(comment.id)}
                                    disabled={deletingId === comment.id}
                                    className="text-xs text-gray-400 hover:text-red-500 transition ml-2 disabled:opacity-40"
                                >
                                    {deletingId === comment.id ? '삭제 중...' : '삭제'}
                                </button>
                            )}
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{comment.content}</p>
                        
                        <div className="mt-1">
                            <ReactionPanel 
                                targetType="comment" 
                                targetId={comment.id} 
                                initialReactions={comment.reactions || []} 
                                currentUserId={currentUser?.id} 
                            />
                        </div>
                    </div>
                ))}
                {comments.length === 0 && (
                    <p className="text-gray-500 text-center py-8 text-sm">아직 댓글이 없습니다. 첫 번째 댓글을 남겨보세요!</p>
                )}
            </div>
        </>
    )
}