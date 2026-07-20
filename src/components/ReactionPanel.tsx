'use client'

import { useState, useEffect, useMemo } from 'react'
import { toggleReaction } from '@/app/reactions/actions'
import { toast } from 'react-hot-toast'
import { createClient } from '@/utils/supabase/client'

const REACTION_TYPES = [
  { id: 'BONE_HIT', label: '뼈때림' },
  { id: 'CRINGE', label: '타격감' },
  { id: 'LIKE', label: '좋아요' },
  { id: 'LOL', label: '웃겨요' },
  { id: 'SAD', label: '슬퍼요' },
]

export default function ReactionPanel({ 
  targetType, 
  targetId, 
  initialReactions = [], 
  currentUserId,
  extraButtons
}: { 
  targetType: 'post' | 'comment', 
  targetId: string, 
  initialReactions: any[], 
  currentUserId?: string,
  extraButtons?: React.ReactNode
}) {
  const [reactions, setReactions] = useState(initialReactions)
  const [loading, setLoading] = useState(false)

  const column = targetType === 'post' ? 'post_id' : 'comment_id'

  // Realtime subscription for this specific target
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`realtime-reactions-${targetId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reactions',
          filter: `${column}=eq.${targetId}`
        },
        (payload) => {
          setReactions(prev => [...prev, payload.new])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'reactions',
          filter: `${column}=eq.${targetId}`
        },
        (payload) => {
          setReactions(prev => prev.filter(r => r.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [targetId, column])

  const handleToggle = async (reactionType: string) => {
    if (!currentUserId) {
      toast.error('로그인이 필요합니다.')
      return
    }
    
    // Optimistic UI Update
    const existingIndex = reactions.findIndex(r => r.user_id === currentUserId && r.reaction_type === reactionType)
    
    setLoading(true)
    try {
      if (existingIndex > -1) {
        // Optimistically remove
        setReactions(prev => prev.filter((_, i) => i !== existingIndex))
      } else {
        // Optimistically add
        setReactions(prev => [...prev, { 
          id: `temp-${Date.now()}`, 
          user_id: currentUserId, 
          [column]: targetId, 
          reaction_type: reactionType 
        }])
      }
      
      await toggleReaction(targetType, targetId, reactionType)
    } catch (e: any) {
      toast.error('리액션 처리에 실패했습니다.')
      // Revert to initial on error by fetching or just letting the user refresh (ideally we would rollback state)
      // Realtime channel will eventually correct it if we just ignore
    } finally {
      setLoading(false)
    }
  }

  // 계산 로직 메모이제이션
  const counts = useMemo(() => {
    const res: Record<string, { count: number, hasReacted: boolean }> = {}
    REACTION_TYPES.forEach(rt => {
      res[rt.id] = { count: 0, hasReacted: false }
    })
    
    reactions.forEach(r => {
      if (res[r.reaction_type]) {
        res[r.reaction_type].count += 1
        if (r.user_id === currentUserId) {
          res[r.reaction_type].hasReacted = true
        }
      }
    })
    return res
  }, [reactions, currentUserId])

  return (
    <div className="flex flex-wrap justify-end gap-1.5 mt-2">
      {REACTION_TYPES.map(rt => {
        const { count, hasReacted } = counts[rt.id]
        
        return (
          <button
            key={rt.id}
            onClick={() => handleToggle(rt.id)}
            disabled={loading && hasReacted}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-gray-500 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors"
          >
            <span>{rt.label}</span>
            {count > 0 && <span className="opacity-80 ml-0.5">{count}</span>}
          </button>
        )
      })}
    </div>
  )
}
