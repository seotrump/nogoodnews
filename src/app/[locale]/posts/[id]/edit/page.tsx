import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { updatePost, deletePost } from '@/app/[locale]/posts/actions'
import { isAdmin } from '@/utils/auth'

import ImageUploadPreview from '@/components/ImageUploadPreview'
import AiImageInjectButton from '@/components/admin/AiImageInjectButton'

export default async function EditPostPage({ params }: { params: Promise<{ id: string, locale: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id, locale } = await params

  
  setRequestLocale(locale);if (!user) {
    redirect('/login')
  }

  const { data: post } = await supabase.from('posts').select('*').eq('id', id).single()

  if (!post) {
    notFound()
  }

  const hasAdmin = isAdmin(user)
  if (post.author_id !== user.id && !hasAdmin) {
    redirect(`/posts/${id}`)
  }

  // updatePost requires the postId as second argument
  const updatePostWithId = updatePost.bind(null, id)
  const deletePostWithIdAndLocale = deletePost.bind(null, id, locale)

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-4xl mx-auto px-4 mt-4 sm:mt-8">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-900">피드 수정</h1>
          
          <form action={updatePostWithId} className="flex flex-col gap-3 sm:gap-4">
            <div>
              <label htmlFor="headline" className="block text-sm font-medium mb-1 text-gray-700">
                제목 (헤드라인)
              </label>
              <input
                type="text"
                id="headline"
                name="headline"
                defaultValue={post.headline}
                required
                className="w-full border border-gray-200 p-2 rounded-lg focus:ring-2 focus:ring-black focus:outline-none text-sm font-bold"
                placeholder="나쁜 소식의 제목을 적어주세요"
              />
            </div>

            <div>
              <label htmlFor="link_title" className="block text-sm font-medium mb-1 text-gray-700">
                원문 기사 제목 (선택)
              </label>
              <input
                type="text"
                id="link_title"
                name="link_title"
                defaultValue={post.link_title || ''}
                className="w-full border border-gray-200 p-2 rounded-lg focus:ring-2 focus:ring-black focus:outline-none text-sm bg-gray-50 text-gray-600"
                placeholder="구글 뉴스 등 출처 기사의 원래 제목"
              />
            </div>

            <div className="flex-grow flex flex-col">
              <div className="flex items-center mb-1">
                <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                  내용
                </label>
                <AiImageInjectButton targetId="content" />
              </div>
              <textarea
                id="content"
                name="content"
                rows={20}
                defaultValue={post.content}
                required
                className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black focus:outline-none text-sm sm:text-base resize-y min-h-[400px]"
                placeholder="본문에 #키워드 형태로 해시태그를 추가할 수 있습니다."
              ></textarea>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium mb-1 text-gray-700">
                카테고리 (선택)
              </label>
              <select
                id="category"
                name="category"
                defaultValue={post.category || 'all'}
                className="w-full border border-gray-200 p-2 rounded-lg focus:ring-2 focus:ring-black focus:outline-none bg-white font-medium text-sm text-gray-700"
              >
                <option value="all">전체 (커뮤니티)</option>
                <option value="politics">정치 (Politics)</option>
                <option value="economy">경제 (Economy)</option>
                <option value="society">사회 (Society)</option>
                <option value="tech">IT/기술 (Tech)</option>
                <option value="world">세계 (World)</option>
                <option value="culture">문화 (Culture)</option>
                <option value="sports">스포츠 (Sports)</option>
                <option value="culture">생활/문화 (Culture)</option>
                <option value="opinion">오피니언 (Opinion)</option>
              </select>
            </div>

            <div>
              <label htmlFor="url" className="block text-sm font-medium mb-1 sm:mb-2 text-gray-700">
                원문 링크 (선택)
              </label>
              <input
                type="url"
                id="url"
                name="url"
                defaultValue={post.url || ''}
                className="w-full border border-gray-200 p-2.5 sm:p-3 rounded-lg focus:ring-2 focus:ring-black focus:outline-none text-sm sm:text-base"
                placeholder="https://..."
              />
            </div>

            <ImageUploadPreview defaultUrl={post.image_url} />

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                formAction={deletePostWithIdAndLocale}
                formNoValidate
                className="px-5 py-2.5 rounded-lg font-bold text-red-600 bg-red-50 hover:bg-red-100 transition text-sm sm:text-base"
              >
                삭제
              </button>
              <div className="flex items-center gap-3">
                <a href={`/posts/${id}`} className="px-5 py-2.5 rounded-lg font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition text-sm sm:text-base">
                  취소
                </a>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-lg font-bold text-white bg-black hover:bg-gray-800 transition text-sm sm:text-base"
                >
                  수정 완료
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
