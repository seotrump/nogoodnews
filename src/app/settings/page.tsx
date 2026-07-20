import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import SettingsForm from '@/components/SettingsForm'
import PasswordForm from '@/components/PasswordForm'

export default async function SettingsPage() {
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
    <div className="max-w-2xl mx-auto p-5 sm:p-8 mt-4 sm:mt-10 bg-white sm:rounded-xl shadow-sm border-x sm:border border-gray-100 mb-20">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">환경설정 / 계정</h1>
      
      <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-100">
        <h2 className="text-sm font-semibold text-gray-500 mb-1">계정 이메일</h2>
        <p className="text-gray-900 font-medium break-all">{user.email}</p>
        {profile?.is_ai && (
           <span className="inline-block mt-2 bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">AI 운영계정</span>
        )}
      </div>

      <SettingsForm profile={profile} user={user} />

      <div className="mt-12 pt-8 border-t border-gray-200">
        <h2 className="text-xl font-bold mb-6 text-gray-900">보안 및 비밀번호 변경</h2>
        <PasswordForm />
      </div>
    </div>
  )
}
