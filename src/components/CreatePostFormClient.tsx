'use client'

import { useRef, useState } from 'react'
import { createPost } from '@/app/[locale]/posts/actions'
import ImageUploadPreview from '@/components/ImageUploadPreview'
import posthog from 'posthog-js'
import { toast } from 'react-hot-toast'

export default function CreatePostFormClient({ t }: { t: any }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true)
    try {
      await createPost(formData)
      posthog.capture('Post Created', {
        hasUrl: !!formData.get('url'),
        hasImage: !!formData.get('image_url')
      })
    } catch (e: any) {
      toast.error('오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4 sm:gap-6">
      <div>
        <label htmlFor="headline" className="block text-sm font-medium mb-1 sm:mb-2 text-gray-700">{t.headline}</label>
        <input id="headline" name="headline" type="text" required placeholder={t.headlinePlaceholder} className="w-full border border-gray-200 p-2.5 sm:p-3 rounded-lg focus:ring-2 focus:ring-black focus:outline-none" />
      </div>
      <div>
        <label htmlFor="content" className="block text-sm font-medium mb-1 sm:mb-2 text-gray-700">{t.content}</label>
        <textarea id="content" name="content" required placeholder={t.contentPlaceholder} rows={5} className="w-full border border-gray-200 p-2.5 sm:p-3 rounded-lg focus:ring-2 focus:ring-black focus:outline-none" />
      </div>
      <div>
        <label htmlFor="category" className="block text-sm font-medium mb-1 sm:mb-2 text-gray-700">
          {t.category}
        </label>
        <select
          id="category"
          name="category"
          defaultValue="all"
          className="w-full border border-gray-200 p-2.5 sm:p-3 rounded-lg focus:ring-2 focus:ring-black focus:outline-none bg-white font-medium text-sm sm:text-base text-gray-700"
        >
          <option value="all">전체 (커뮤니티)</option>
          <option value="politics">정치 (Politics)</option>
          <option value="economy">경제 (Economy)</option>
          <option value="society">사회 (Society)</option>
          <option value="tech">IT/기술 (Tech)</option>
          <option value="world">세계 (World)</option>
          <option value="entertainment">연예 (Entertainment)</option>
          <option value="sports">스포츠 (Sports)</option>
          <option value="culture">생활/문화 (Culture)</option>
          <option value="opinion">오피니언 (Opinion)</option>
        </select>
      </div>
      <div>
        <label htmlFor="url" className="block text-sm font-medium mb-1 sm:mb-2 text-gray-700">{t.sourceUrl}</label>
        <input id="url" name="url" type="url" placeholder={t.sourceUrlPlaceholder} className="w-full border border-gray-200 p-2.5 sm:p-3 rounded-lg focus:ring-2 focus:ring-black focus:outline-none" />
      </div>
      
      <ImageUploadPreview />
      <button type="submit" disabled={isSubmitting} className="bg-black text-white font-medium py-3 rounded-lg hover:bg-gray-800 transition shadow-sm mt-1 sm:mt-2 disabled:bg-gray-400">
        {isSubmitting ? '...' : t.submit}
      </button>
    </form>
  )
}
