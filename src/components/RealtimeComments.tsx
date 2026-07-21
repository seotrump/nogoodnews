'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { toPng } from 'html-to-image'
import { Link } from '@/i18n/routing'
import { deleteComment } from '@/app/[locale]/posts/actions'
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
    const [zoomedImage, setZoomedImage] = useState<string | null>(null)

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

    const handleCapture = async (mode: 'all' | 'dialogue') => {
        const container = document.getElementById('comments-container')
        if (!container) return

        const loadingToast = toast.loading('이미지 생성 중...')
        try {
            const className = mode === 'all' ? 'capture-mode-all' : 'capture-mode-dialogue'
            container.classList.add(className)

            // DOM 렌더링 대기
            await new Promise(resolve => setTimeout(resolve, 150))

            const dataUrl = await toPng(container, {
                backgroundColor: '#ffffff',
                pixelRatio: 2,
            })

            container.classList.remove(className)

            try {
                const res = await fetch(dataUrl)
                const blob = await res.blob()
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ])
                toast.dismiss(loadingToast)
                toast.success('클립보드에 복사되었습니다! (Ctrl+V)')
            } catch (clipErr) {
                const link = document.createElement('a')
                link.download = `nogoodnews-comments-${Date.now()}.png`
                link.href = dataUrl
                link.click()
                toast.dismiss(loadingToast)
                toast.success('이미지가 다운로드되었습니다.')
            }

        } catch (e) {
            console.error(e)
            toast.dismiss(loadingToast)
            toast.error('캡처에 실패했습니다.')
            container.classList.remove('capture-mode-all', 'capture-mode-dialogue')
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
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    댓글 <span className="bg-gray-100 text-gray-600 text-sm px-2 py-1 rounded-full">{comments.length}</span>
                </h3>
                {comments.length > 0 && (
                    <div className="flex gap-2">
                        <button onClick={() => handleCapture('all')} className="text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-1.5 px-3 rounded-lg transition flex items-center gap-1 shadow-sm">
                            📸 전체박제
                        </button>
                        <button onClick={() => handleCapture('dialogue')} className="text-xs bg-black hover:bg-gray-800 text-white font-bold py-1.5 px-3 rounded-lg transition flex items-center gap-1 shadow-sm">
                            💬 대화박제
                        </button>
                    </div>
                )}
            </div>

            <div id="comments-container" className="flex flex-col gap-6 bg-white">
                {comments.map((comment: any) => (
                    <div key={comment.id} className="pb-6 border-b last:border-b-0 border-gray-100 comment-item">
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
                                    className="delete-btn text-xs text-gray-400 hover:text-red-500 transition ml-2 disabled:opacity-40"
                                >
                                    {deletingId === comment.id ? '삭제 중...' : '삭제'}
                                </button>
                            )}
                        </div>
                        <p className="comment-text text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{comment.content}</p>
                        
                        {comment.image_url && (
                            <div className="mt-3 mb-2 rounded-lg overflow-hidden border border-gray-100 max-w-sm inline-block">
                                <img 
                                    src={comment.image_url} 
                                    alt="첨부된 짤방" 
                                    className="w-full h-auto max-h-60 object-contain bg-gray-50 cursor-zoom-in" 
                                    loading="lazy" 
                                    onClick={() => setZoomedImage(comment.image_url)}
                                />
                            </div>
                        )}

                        <div className="mt-1 reaction-panel">
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

            {zoomedImage && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4 cursor-zoom-out"
                    onClick={() => setZoomedImage(null)}
                >
                    <img src={zoomedImage} alt="Zoomed" className="max-w-full max-h-full object-contain" />
                    <button className="absolute top-4 right-4 text-white text-3xl font-bold">&times;</button>
                </div>
            )}
        </>
    )
}