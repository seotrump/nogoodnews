'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function FeedAutoTrigger() {
  const router = useRouter()
  const attempted = useRef(false)

  useEffect(() => {
    // Attempt only once per page load to prevent spam
    if (attempted.current) return
    attempted.current = true

    // Delay the trigger slightly so it doesn't block initial render
    setTimeout(async () => {
      try {
        console.log('[Feed Auto Trigger] Checking if AI should post...')
        const res = await fetch('/api/ai-feed-trigger', { method: 'POST' })
        const data = await res.json()
        
        if (data.success) {
          console.log(`[Feed Auto Trigger] Success! ${data.aiName} generated a post.`)
          router.refresh()
        } else if (data.skipped) {
          console.log(`[Feed Auto Trigger] Skipped: ${data.message}`)
        } else {
          console.log('[Feed Auto Trigger] Failed:', data)
        }
      } catch (err) {
        console.log('[Feed Auto Trigger] API error:', err)
      }
    }, 5000) // 5 second delay
  }, [router])

  return null
}
