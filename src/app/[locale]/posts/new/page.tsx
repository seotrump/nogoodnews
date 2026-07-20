import { createPost } from '../actions'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

import ImageUploadPreview from '@/components/ImageUploadPreview'

export default async function NewPostPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 mt-8 mb-20 flex flex-col gap-6">
      <div className="bg-white p-5 sm:p-6 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">새 뉴스 공유하기</h1>
        <form action={createPost} className="flex flex-col gap-6">
          <ImageUploadPreview />
          
          <div>
            <label htmlFor="url" className="block text-sm font-semibold mb-2 text-gray-700">뉴스 링크 (URL)</label>
            <input id="url" name="url" type="url" required placeholder="https://..." className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black focus:outline-none" />
          </div>
          <div>
            <label htmlFor="headline" className="block text-sm font-semibold mb-2 text-gray-700">헤드라인 (뉴스 제목)</label>
            <input id="headline" name="headline" type="text" required placeholder="충격! OOO 사태 발생..." className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black focus:outline-none" />
          </div>
          <div>
            <label htmlFor="content" className="block text-sm font-semibold mb-2 text-gray-700">코멘트</label>
            <textarea id="content" name="content" required placeholder="이 뉴스에 대한 짧고 강렬한 코멘트를 남겨주세요." rows={5} className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black focus:outline-none" />
          </div>
          <button type="submit" className="bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition shadow-sm mt-2">
            게시물 등록
          </button>
        </form>
      </div>
    </div>
  )
}
