'use client'

import { Toaster, toast } from 'react-hot-toast'
import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export default function ToastProvider() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check if there's a flash message cookie
    const match = document.cookie.match(new RegExp('(^| )flash_msg=([^;]+)'))
    if (match) {
      // 서버와 프레임워크의 이중 인코딩 중첩을 해결하기 위해 두 번 디코딩합니다.
      const msg = decodeURIComponent(decodeURIComponent(match[2]))

      toast.success(msg)

      // Clear the cookie so it doesn't trigger again
      document.cookie = "flash_msg=; Max-Age=0; path=/;"
    }
  }, [pathname, searchParams]) // Re-run on navigation or query changes

  return (
    <Toaster
      position="bottom-center"
      toastOptions={{
        style: {
          background: '#1a1a1a',
          color: '#ffffff',
          fontSize: '15px',
          fontWeight: '600',
          padding: '12px 24px',
          borderRadius: '8px',
        },
      }}
    />
  )
}