'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { toPng } from 'html-to-image'
import { Link } from '@/i18n/routing'
import { deleteComment } from '@/app/[locale]/posts/actions'
import { ADMIN_EMAIL } from '@/utils/auth'
import { toast } from 'react-hot-toast'
import ReactionPanel from './ReactionPanel'
import { saveBotCaptures } from '@/app/reactions/actions'
import { CheckSquare, Camera, MessageSquare } from 'lucide-react'
import { getUserProfileUrl } from '@/utils/user'
import { useRouter } from 'next/navigation'

export default function RealtimeComments({ postId, initialComments, currentUser }: { postId: string, initialComments: any[], currentUser: any }) {
    const router = useRouter()
    const supabase = createClient()
    const [comments, setComments] = useState(initialComments)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [zoomedImage, setZoomedImage] = useState<string | null>(null)
    const [isSelectMode, setIsSelectMode] = useState(false)
    const [selectedCommentIds, setSelectedCommentIds] = useState<string[]>([])

    // Ï§ëÎ≥µ ?úÍ±∞ Î∞??ïÎ†¨ ?†Ìã∏Î¶¨Ìã∞
    const mergeComments = (prev: any[], next: any[]) => {
        const all = [...prev, ...next]
        const unique = Array.from(new Map(all.map(c => [c.id, c])).values())
        return unique.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    }

    // ?úÎ≤Ñ ?°ÏÖò(?¨Ïö©???ìÍ? ?ëÏÑ± ???ºÎ°ú ?ÑÎã¨??ÏµúÏã† initialComments?Ä 
    // Realtime?ºÎ°ú Î®ºÏ? ?§Ïñ¥??commentsÎ•?Î≥ëÌï©?òÏó¨ ?ÑÎùΩ?¥ÎÇò ??ñ¥?∞Í∏∞ Î∞©Ï?
    useEffect(() => {
        setComments(current => mergeComments(current, initialComments))
    }, [initialComments])

    const toggleSelection = (id: string) => {
        setSelectedCommentIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }

    const isAdmin = currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()

    const canDelete = (comment: any) => {
        if (!currentUser) return false
        return isAdmin || comment.author_id === currentUser.id
    }

    const handleDelete = async (commentId: string) => {
        if (!confirm('?ìÍ?????†ú?òÏãúÍ≤†Ïäµ?àÍπå?')) return
        setDeletingId(commentId)
        try {
            await deleteComment(commentId, postId)
            setComments(prev => prev.filter(c => c.id !== commentId))
            toast.success('?ìÍ?????†ú?òÏóà?µÎãà??')
        } catch (e) {
            toast.error('??†ú???§Ìå®?àÏäµ?àÎã§.')
        } finally {
            setDeletingId(null)
        }
    }

    const handleCapture = async (mode: 'all' | 'dialogue' | 'selected') => {
        const container = document.getElementById('comments-container')
        if (!container) return

        const loadingToast = toast.loading('?¥Î?ÏßÄ ?ùÏÑ± Ï§?..')
        try {
            const className = mode === 'all' ? 'capture-mode-all' : 
                              mode === 'selected' ? 'capture-mode-selected' : 'capture-mode-dialogue'
            container.classList.add(className)

            // Íµ¨Í? Î≤àÏó≠Í∏??±Ïóê??Ï£ºÏûÖ???¨Î°ú???§Î¶¨Ïß??§Ì??ºÏãú???ëÍ∑º ???êÎü¨ Î∞©Ï?
            const disabledSheets: CSSStyleSheet[] = [];
            Array.from(document.styleSheets).forEach(sheet => {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const rules = sheet.cssRules;
                } catch (e: any) {
                    // SecurityError ??Î™®Îì† ?ëÍ∑º Í±∞Î? ?êÎü¨ Î∞úÏÉù ??Î¨¥Ï°∞Í±?ÎπÑÌôú?±Ìôî
                    sheet.disabled = true;
                    disabledSheets.push(sheet);
                }
            });

            // DOM ?åÎçîÎß??ÄÍ∏?
            await new Promise(resolve => setTimeout(resolve, 150))

            const dataUrl = await toPng(container, {
                backgroundColor: '#ffffff',
                pixelRatio: 2,
                skipFonts: true, // ?¨Î°ú???§Î¶¨Ïß????∞Ìä∏/?§Ì??ºÏãú???§Ï∫î ?ùÎûµ (Î≥¥Ïïà ?êÎü¨ ?êÏ≤ú Ï∞®Îã®)
            })

            // ?êÎûò?ÄÎ°?Î≥µÍµ¨
            disabledSheets.forEach(sheet => {
                sheet.disabled = false;
            });

            container.classList.remove(className)

            try {
                const res = await fetch(dataUrl)
                const blob = await res.blob()
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ])

                // ?êÎèô ?Ä??Î°úÏßÅ (Î°úÍ∑∏?∏Îêú ?¨Ïö©?êÎßå)
                if (currentUser) {
                    const fileExt = 'png'
                    const fileName = `capture-${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`
                    
                    const { error: uploadError } = await supabase.storage
                        .from('captures')
                        .upload(fileName, blob)
                    
                    if (!uploadError) {
                        const { data: { publicUrl } } = supabase.storage
                            .from('captures')
                            .getPublicUrl(fileName)
                            
                        let capturedBots: string[] = []
                        if (mode === 'selected') {
                            capturedBots = comments
                                .filter((c: any) => selectedCommentIds.includes(c.id) && c.accounts?.is_ai)
                                .map((c: any) => c.author_id)
                        } else {
                            capturedBots = comments
                                .filter((c: any) => c.accounts?.is_ai)
                                .map((c: any) => c.author_id)
                        }
                        
                        const uniqueBots = Array.from(new Set(capturedBots)).filter(id => id !== currentUser.id)

                        // 1. ?†Ï? Î≥∏Ïù∏??Ï∫°Ï≤ò???¥Îùº?¥Ïñ∏?∏Ïóê???Ä??(RLS ?µÍ≥º)
                        const { error: insertErr } = await supabase.from('user_captures').insert({
                            user_id: currentUser.id,
                            image_url: publicUrl,
                            post_id: postId
                        })
                        if (insertErr) console.error('Capture insert error:', insertErr)
                            
                        // 2. Î¥áÎì§??Ï∫°Ï≤ò???úÎ≤Ñ ?°ÏÖò(Admin Í∂åÌïú)?ºÎ°ú ?∞Ìöå ?Ä??
                        if (uniqueBots.length > 0) {
                            try {
                                await saveBotCaptures(uniqueBots, publicUrl, postId)
                            } catch (e) {
                                console.error('Failed to save for bots:', e)
                            }
                        }
                    } else {
                        console.error('Capture upload error:', uploadError)
                    }
                }

                toast.dismiss(loadingToast)
                toast.success('?¥Î¶ΩÎ≥¥Îìú??Î≥µÏÇ¨?òÏóà?µÎãà?? (Ctrl+V)')
            } catch (clipErr) {
                const link = document.createElement('a')
                link.download = `nogoodnews-comments-${Date.now()}.png`
                link.href = dataUrl
                link.click()
                toast.dismiss(loadingToast)
                toast.success('?¥Î?ÏßÄÍ∞Ä ?§Ïö¥Î°úÎìú?òÏóà?µÎãà??')
            }

            // Ï∫°Ï≤ò ?±Í≥µ ???†ÌÉù Î™®Îìú ?¥Ï†ú
            setIsSelectMode(false)
            setSelectedCommentIds([])
        } catch (e: any) {
            console.error(e)
            toast.dismiss(loadingToast)
            toast.error('Ï∫°Ï≤ò???§Ìå®?àÏäµ?àÎã§.')
            container.classList.remove('capture-mode-all', 'capture-mode-dialogue')
        }
    }

    useEffect(() => {
        const channel = supabase
            .channel(`realtime-comments-${postId}`)
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
                        .select('*, accounts(display_name, is_ai, avatar_url, username, level, activity_score, badges)')
                        .eq('id', payload.new.id)
                        .single()

                    if (newComment) {
                        setComments((current) => mergeComments(current, [newComment]))
                        // A??+ B???òÏù¥Î∏åÎ¶¨?? 
                        // B??Realtime)?ºÎ°ú ?îÎ©¥??0.1Ï¥àÎßå??Ï¶âÍ∞Å ?ÖÎç∞?¥Ìä∏ ????
                        // A??router.refresh)?ºÎ°ú ?úÎ≤Ñ Ï∫êÏãúÎ•?Î∞±Í∑∏?ºÏö¥?úÏóê??Í∞ïÏ†úÎ°???Î≤?????ñ¥?åÏõå ?†Ïã§??100% Î∞©Ï???
                        router.refresh()
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    ?ìÍ? <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{comments.length}</span>
                </h3>
                {comments.length > 0 && (
                    <div className="flex flex-wrap items-center justify-end self-end gap-1.5 w-full sm:w-auto">
                        {isSelectMode ? (
                            <>
                                <button onClick={() => {setIsSelectMode(false); setSelectedCommentIds([]);}} className="whitespace-nowrap text-[11px] sm:text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-1.5 px-3 rounded-lg transition">
                                    Ï∑®ÏÜå
                                </button>
                                <button 
                                    onClick={() => handleCapture('selected')} 
                                    disabled={selectedCommentIds.length === 0}
                                    className="whitespace-nowrap text-[11px] sm:text-xs bg-black hover:bg-gray-800 text-white font-bold py-1.5 px-3 rounded-lg transition flex items-center gap-1 shadow-sm disabled:opacity-50"
                                >
                                    <Camera className="w-3.5 h-3.5" /> {selectedCommentIds.length}Í∞?Ï∫°Ï≤ò?òÍ∏∞
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setIsSelectMode(true)} className="whitespace-nowrap text-[11px] sm:text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-1.5 px-2.5 sm:px-3 rounded-lg transition flex items-center gap-1 shadow-sm">
                                    <CheckSquare className="w-3.5 h-3.5" /> ?†ÌÉùÎ∞ïÏ†ú
                                </button>
                                <button onClick={() => handleCapture('all')} className="whitespace-nowrap text-[11px] sm:text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-1.5 px-2.5 sm:px-3 rounded-lg transition flex items-center gap-1 shadow-sm">
                                    <Camera className="w-3.5 h-3.5" /> ?ÑÏ≤¥Î∞ïÏ†ú
                                </button>
                                <button onClick={() => handleCapture('dialogue')} className="whitespace-nowrap text-[11px] sm:text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-1.5 px-2.5 sm:px-3 rounded-lg transition flex items-center gap-1 shadow-sm">
                                    <MessageSquare className="w-3.5 h-3.5" /> ?Ä?îÎ∞ï??
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div id="comments-container" className={`bg-white transition-all duration-300 ${isSelectMode ? 'p-2 sm:p-4 rounded-xl border border-gray-200' : ''}`}>
                <div className="flex flex-col gap-2">
                {comments.map((comment: any, index: number) => (
                    <div 
                        key={`${comment.id}-${index}`}
                        className={`pb-3 border-b last:border-b-0 border-gray-100 comment-item ${isSelectMode && !selectedCommentIds.includes(comment.id) ? 'not-selected-for-capture opacity-50' : ''}`}
                        onClick={() => isSelectMode && toggleSelection(comment.id)}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <Link href={getUserProfileUrl(comment)} className="flex items-center gap-2 font-semibold text-gray-800 hover:underline">
                                {comment.accounts?.avatar_url ? (
                                    <img src={comment.accounts.avatar_url} alt="Avatar" className="w-5 h-5 rounded-full object-cover border" />
                                ) : (
                                    <div className="w-5 h-5 rounded-full bg-gray-200 border flex items-center justify-center text-[8px] text-gray-400">?</div>
                                )}
                                <div className="flex items-center gap-1.5">
                                    <span>{comment.accounts?.display_name || '?µÎ™Ö'}</span>
                                </div>
                            </Link>

                            <span className="text-xs text-gray-400 ml-auto flex items-center gap-3">
                                <span>{new Date(comment.created_at).toLocaleString('ko-KR')}</span>
                                {isSelectMode && (
                                    <div className="checkbox-wrapper flex items-center">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedCommentIds.includes(comment.id)}
                                            readOnly
                                            className="w-4 h-4 text-black bg-gray-100 border-gray-300 rounded focus:ring-black focus:ring-2 cursor-pointer"
                                        />
                                    </div>
                                )}
                            </span>

                            {canDelete(comment) && (
                                <button
                                    onClick={() => handleDelete(comment.id)}
                                    disabled={deletingId === comment.id}
                                    className="delete-btn text-xs text-gray-400 hover:text-red-500 transition ml-2 disabled:opacity-40"
                                >
                                    {deletingId === comment.id ? '??†ú Ï§?..' : '??†ú'}
                                </button>
                            )}
                        </div>
                        <p className="comment-text text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{comment.content}</p>
                        
                        {comment.image_url && (
                            <div className="mt-3 mb-2 rounded-lg overflow-hidden border border-gray-100 max-w-sm inline-block">
                                <img 
                                    src={comment.image_url} 
                                    alt="Ï≤®Î???Ïß§Î∞©" 
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
                                currentUser={currentUser} 
                            />
                        </div>
                    </div>
                ))}
                </div>
                {comments.length === 0 && (
                    <p className="text-gray-500 text-center py-8 text-sm">?ÑÏßÅ ?ìÍ????ÜÏäµ?àÎã§. Ï≤?Î≤àÏß∏ ?ìÍ????®Í≤®Î≥¥ÏÑ∏??</p>
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
