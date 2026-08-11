'use client'

import { useRef, useState } from 'react'
import { createPost } from '@/app/[locale]/posts/actions'
import ImageUploadPreview from '@/components/ImageUploadPreview'
import posthog from 'posthog-js'
import { toast } from 'react-hot-toast'

export default function CreatePostFormClient({ t }: { t: any }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pollEnabled, setPollEnabled] = useState(false)
  const [pollOptions, setPollOptions] = useState<string[]>(['', ''])

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

      {/* 여론조사(Poll) 추가 UI */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-bold text-gray-800">📊 투표(Poll) 추가하기</label>
          <button 
            type="button" 
            onClick={() => setPollEnabled(!pollEnabled)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-full transition-colors"
          >
            {pollEnabled ? '투표 취소' : '+ 투표 만들기'}
          </button>
        </div>

        {pollEnabled && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <input 
              name="poll_question" 
              type="text" 
              placeholder="투표 질문을 입력하세요 (예: 가장 기대되는 기능은?)" 
              className="w-full border border-gray-300 p-2.5 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-medium"
              required={pollEnabled}
            />
            <div className="space-y-2">
              {pollOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-gray-400 font-medium text-sm w-4">{idx + 1}.</span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...pollOptions];
                      newOpts[idx] = e.target.value;
                      setPollOptions(newOpts);
                    }}
                    placeholder={`선택지 ${idx + 1}`}
                    className="flex-1 border border-gray-200 p-2 rounded-md focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                    required={pollEnabled}
                  />
                  {idx > 1 && (
                    <button 
                      type="button" 
                      onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                      className="text-gray-400 hover:text-red-500 px-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            {pollOptions.length < 4 && (
              <button 
                type="button" 
                onClick={() => setPollOptions([...pollOptions, ''])}
                className="text-sm font-medium text-gray-500 hover:text-gray-800 flex items-center gap-1 mt-1"
              >
                + 선택지 추가
              </button>
            )}
            {/* 서버 전송용 히든 필드 */}
            <input type="hidden" name="poll_options" value={JSON.stringify(pollOptions)} />
          </div>
        )}
      </div>
      
      <ImageUploadPreview />
      <button type="submit" disabled={isSubmitting} className="bg-black text-white font-medium py-3 rounded-lg hover:bg-gray-800 transition shadow-sm mt-1 sm:mt-2 disabled:bg-gray-400">
        {isSubmitting ? '...' : t.submit}
      </button>
    </form>
  )
}
