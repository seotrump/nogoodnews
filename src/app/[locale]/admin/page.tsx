import React from 'react'
import { getTranslations, getLocale } from 'next-intl/server'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/utils/auth'
import SettingsForm from '@/components/SettingsForm'
import PasswordForm from '@/components/PasswordForm'
import ForceRunForm from './ForceRunForm'
import { forceAiPost } from './actions'
import { Link } from '@/i18n/routing'
import SystemPromptsForm from '@/components/admin/SystemPromptsForm'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const t = await getTranslations('Settings')
  const locale = await getLocale()
  const boundForceAiPost = forceAiPost.bind(null, locale)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    redirect('/')
  }

  const { tab = 'main' } = await searchParams

  const { data: profile } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: siteSettings } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 'global')
    .single()

  return (
    <div className="w-full max-w-4xl mx-auto p-2 sm:px-4 py-6 sm:py-8 pb-20 flex flex-col gap-4 sm:gap-6">
      
      {/* Inner Tabs */}
      <div className="flex flex-row gap-2 border-b border-gray-200 pb-2">
        <Link 
          href="/admin?tab=main" 
          className={`px-4 py-2 text-sm font-bold rounded-t-lg ${tab === 'main' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        >
          환경 설정
        </Link>
        <Link 
          href="/admin?tab=robot" 
          className={`px-4 py-2 text-sm font-bold rounded-t-lg ${tab === 'robot' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        >
          오토봇 설정
        </Link>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-b-xl shadow-sm border border-gray-100 border-t-0">
        {tab === 'main' && (
          <>
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {t('title')}
                </h1>
                <span className="bg-gray-100 text-gray-600 text-sm font-bold px-2 py-1 rounded">{t('version')}</span>
              </div>
              <ForceRunForm action={boundForceAiPost} />
            </div>
            <SettingsForm profile={profile} user={user} />
            <div className="mt-12 pt-8 border-t border-gray-200">
              <h2 className="text-xl font-bold mb-6 text-gray-900">{t('securityAndPw')}</h2>
              <PasswordForm />
            </div>
          </>
        )}

        {tab === 'robot' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="prose prose-sm text-gray-500 mb-8 max-w-none">
              <p>이곳에서 오토 로봇 자동 생성 시 사용되는 프롬프트를 전역적으로 수정할 수 있습니다.</p>
            </div>
            <SystemPromptsForm settings={siteSettings || {}} />
          </div>
        )}

      </div>
    </div>
  )
}
