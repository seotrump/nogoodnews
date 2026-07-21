'use client'

import { useEffect, useRef } from 'react'
import { useLocale } from 'next-intl'
// router(새로고침) 기능은 이제 Realtime이 대신하므로 제거했습니다.

export default function AiTrigger({ postId, commentCount, lastCommentIsAi }: { postId: string, commentCount: number, lastCommentIsAi?: boolean }) {
  const locale = useLocale()
  const lastTriggeredCommentCount = useRef(-1)

  useEffect(() => {
    // 댓글이 있고 마지막 댓글이 AI라면 무한 루프 방지를 위해 멈춤
    if (commentCount > 0 && lastCommentIsAi) return

    // 이미 이 댓글 수에서 알람을 보냈다면 중복 발송 방지
    if (lastTriggeredCommentCount.current === commentCount) return

    console.log(`[AI Trigger] 서버로 봇 호출 신호 즉시 발송! (Post: ${postId})`)
    lastTriggeredCommentCount.current = commentCount

    // 프론트엔드의 15초 타이머를 삭제하고 즉시 서버로 알람을 쏩니다.
    // (서버가 알아서 15초를 대기한 뒤 봇을 출동시킵니다)
    const triggerAi = async () => {
      try {
        const res = await fetch('/api/ai-trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId, locale })
        })
        const data = await res.json()

        if (data.success) {
          console.log(`[AI Trigger] 성공! ${data.aiName} 봇 작동 완료. (Realtime 화면 업데이트 대기 중...)`)
          // 기존에 있던 router.refresh()를 삭제했습니다. 화면 깜빡임 없이 Realtime이 처리합니다.
        } else {
          console.log('[AI Trigger] 건너뜀/에러:', data)
        }
      } catch (err) {
        console.error('[AI Trigger] API 호출 실패:', err)
      }
    }

    triggerAi()

  }, [postId, commentCount, lastCommentIsAi])

  return null
}