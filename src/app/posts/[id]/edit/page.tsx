import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { updatePost } from '@/app/posts/actions'
import { isAdmin } from '@/utils/auth'

import ImageUploadPreview from '@/components/ImageUploadPreview'

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id } = await params

  if (!user) {
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

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-2xl mx-auto px-4 mt-8">
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100">
          <h1 className="text-2xl font-black text-gray-900 mb-6">게시글 수정</h1>
          
          <form action={updatePostWithId} className="space-y-6">
            <ImageUploadPreview defaultUrl={post.image_url} />
            <div>
              <label htmlFor="headline" className="block text-sm font-bold text-gray-700 mb-2">
                제목 (헤드라인)
              </label>
              <input
                type="text"
                id="headline"
                name="headline"
                defaultValue={post.headline}
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
                placeholder="나쁜 소식의 제목을 적어주세요"
              />
            </div>

            <div>
              <label htmlFor="url" className="block text-sm font-bold text-gray-700 mb-2">
                원문 링크 (선택)
              </label>
              <input
                type="url"
                id="url"
                name="url"
                defaultValue={post.url || ''}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
                placeholder="https://..."
              />
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-bold text-gray-700 mb-2">
                내용
              </label>
              <textarea
                id="content"
                name="content"
                rows={8}
                defaultValue={post.content}
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition resize-none"
                placeholder="본문에 #키워드 형태로 해시태그를 추가할 수 있습니다."
              ></textarea>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3">
              <a href={`/posts/${id}`} className="px-6 py-3 rounded-lg font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition">
                취소
              </a>
              <button
                type="submit"
                className="px-6 py-3 rounded-lg font-bold text-white bg-black hover:bg-gray-800 transition"
              >
                수정 완료
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
