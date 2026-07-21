import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import SettingsForm from '@/components/SettingsForm'
import PasswordForm from '@/components/PasswordForm'

import { getTranslations } from 'next-intl/server'

export default async function SettingsPage() {
  const t = await getTranslations('Settings')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="w-full max-w-2xl mx-auto p-3 sm:p-8 mt-2 sm:mt-10 bg-white sm:rounded-xl shadow-sm border-x sm:border border-gray-100 mb-20">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-900">{t('title')}</h1>
      
      <SettingsForm profile={profile} user={user} />

      <div className="mt-12 pt-8 border-t border-gray-200">
        <h2 className="text-xl font-bold mb-6 text-gray-900">{t('securityAndPw')}</h2>
        <PasswordForm />
      </div>
    </div>
  )
}
