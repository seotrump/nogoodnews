'use client'

import { useRef, useState } from 'react'
import { addComment } from '@/app/[locale]/posts/actions'
import { createClient } from '@supabase/supabase-js'
import { toast } from 'react-hot-toast'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function CommentForm({ postId }: { postId: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) await uploadImage(file)
        break
      }
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadImage(e.target.files[0])
    }
  }

  const uploadImage = async (file: File) => {
    setIsUploading(true)
    const toastId = toast.loading('이미지 업로드 중...')
    try {
      const fileExt = file.name.split('.').pop() || 'png'
      const filePath = `comment-${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('comment-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('comment-images')
        .getPublicUrl(filePath)

      setImageUrl(publicUrl)
      toast.success('이미지가 첨부되었습니다.', { id: toastId })
    } catch (error) {
      console.error(error)
      toast.error('이미지 업로드에 실패했습니다.', { id: toastId })
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (formData: FormData) => {
    if (imageUrl) {
      formData.append('image_url', imageUrl)
    }
    await addComment(formData, postId)
    formRef.current?.reset()
    setImageUrl(null)
  }

  return (
    <form ref={formRef} action={handleSubmit} className="mt-6 border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
      <div className="p-3">
        <textarea
          name="content"
          required
          onPaste={handlePaste}
          className="w-full text-sm focus:outline-none resize-none bg-transparent"
          placeholder="Ctrl+V로 캡처한 이미지를 붙여넣거나 댓글을 남겨주세요..."
          rows={3}
        />
        {imageUrl && (
          <div className="mt-2 relative inline-block">
            <img src={imageUrl} alt="첨부 이미지" className="h-32 object-contain border border-gray-200 rounded" />
            <button
              type="button"
              onClick={() => setImageUrl(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md"
            >
              ✕
            </button>
          </div>
        )}
      </div>
      <div className="bg-gray-50 border-t border-gray-100 p-2 flex items-center justify-between">
        <div className="flex items-center gap-2 px-2">
          <label className="cursor-pointer text-gray-500 hover:text-black transition flex items-center gap-1 text-sm font-semibold">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            사진 첨부
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
        </div>
        <button 
          type="submit" 
          disabled={isUploading}
          className="bg-black text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-gray-800 transition shadow-sm disabled:bg-gray-400"
        >
          {isUploading ? '업로드 중...' : '작성하기'}
        </button>
      </div>
    </form>
  )
}
