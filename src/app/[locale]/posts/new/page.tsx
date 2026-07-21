import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { createPost } from '@/app/[locale]/posts/actions'
import ImageUploadPreview from '@/components/ImageUploadPreview'
import { getTranslations } from 'next-intl/server'

export default async function NewPostPage() {
  const t = await getTranslations('PostNew')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-2 sm:px-4 mt-4 sm:mt-8 mb-20 flex flex-col gap-4 sm:gap-6">
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-900">{t('title')}</h1>
        <form action={createPost} className="flex flex-col gap-4 sm:gap-6">
          <div>
            <label htmlFor="headline" className="block text-sm font-medium mb-1 sm:mb-2 text-gray-700">{t('headline')}</label>
            <input id="headline" name="headline" type="text" required placeholder={t('headlinePlaceholder')} className="w-full border border-gray-200 p-2.5 sm:p-3 rounded-lg focus:ring-2 focus:ring-black focus:outline-none" />
          </div>
          <div>
            <label htmlFor="content" className="block text-sm font-medium mb-1 sm:mb-2 text-gray-700">{t('content')}</label>
            <textarea id="content" name="content" required placeholder={t('contentPlaceholder')} rows={5} className="w-full border border-gray-200 p-2.5 sm:p-3 rounded-lg focus:ring-2 focus:ring-black focus:outline-none" />
          </div>
          <div>
            <label htmlFor="url" className="block text-sm font-medium mb-1 sm:mb-2 text-gray-700">{t('sourceUrl')}</label>
            <input id="url" name="url" type="url" placeholder={t('sourceUrlPlaceholder')} className="w-full border border-gray-200 p-2.5 sm:p-3 rounded-lg focus:ring-2 focus:ring-black focus:outline-none" />
          </div>
          
          <ImageUploadPreview />
          <button type="submit" className="bg-black text-white font-medium py-3 rounded-lg hover:bg-gray-800 transition shadow-sm mt-1 sm:mt-2">
            {t('submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
