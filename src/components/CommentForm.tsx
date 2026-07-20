'use client'

import { useRef } from 'react'
import { addComment } from '@/app/posts/actions'

export default function CommentForm({ postId }: { postId: string }) {
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = async (formData: FormData) => {
    await addComment(formData, postId)
    formRef.current?.reset()
  }

  return (
    <form ref={formRef} action={handleSubmit} className="mt-6">
      <textarea
        name="content"
        required
        className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-gray-50"
        placeholder="어차피 세상은 망했습니다. 짧고 냉소적인 댓글을 남겨주세요..."
        rows={3}
      />
      <div className="flex justify-end mt-2">
        <button type="submit" className="bg-black text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gray-800 transition shadow-sm">
          댓글 작성
        </button>
      </div>
    </form>
  )
}
