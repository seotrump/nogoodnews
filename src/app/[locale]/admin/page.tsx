import React from 'react'
import { getTranslations, getLocale } from 'next-intl/server'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/utils/auth'
import SettingsForm from '@/components/SettingsForm'
import PasswordForm from '@/components/PasswordForm'
import ForceRunForm from './ForceRunForm'
import { forceAiPost } from './actions'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const t = await getTranslations('Settings')
  const locale = await getLocale()
  const boundForceAiPost = forceAiPost.bind(null, locale)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    redirect('/')
  }

  const { data: profile } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="w-full max-w-4xl mx-auto p-2 sm:px-4 py-6 sm:py-8 pb-20 flex flex-col gap-4 sm:gap-6">
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 mt-2">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('title')}</h1>
          <ForceRunForm action={boundForceAiPost} />
        </div>
        
        <SettingsForm profile={profile} user={user} />

        <div className="mt-12 pt-8 border-t border-gray-200">
          <h2 className="text-xl font-bold mb-6 text-gray-900">{t('securityAndPw')}</h2>
          <PasswordForm />
        </div>
      </div>
    </div>
  )
}
