'use client'

import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { deletePost } from '@/app/feed-actions'

export default function DeletePostButton({ postId, isDetail, className }: { postId: string, isDetail: boolean, className?: string }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation() // Prevent triggering the Link wrapper if any

    if (!confirm('정말 이 게시물과 댓글들을 삭제하시겠습니까?')) return

    setIsDeleting(true)
    try {
      await deletePost(postId)
      toast.success('게시물이 정상적으로 삭제되었습니다.')
      
      if (isDetail) {
        router.push('/')
      } else {
        router.refresh()
      }
    } catch (error) {
      console.error(error)
      toast.error('삭제 권한이 없거나 오류가 발생했습니다.')
    } finally {
      setIsDeleting(false)
    }
  }

  const defaultClassName = "absolute top-4 right-4 z-10 text-gray-400 hover:text-red-500 bg-white p-2 rounded-full shadow-sm border hover:border-red-200 transition"
  
  return (
    <button 
      onClick={handleDelete}
      disabled={isDeleting}
      className={`${className || defaultClassName} ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`} 
      title="관리자 권한으로 삭제"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  )
}
