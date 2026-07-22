import { createClient } from '@/utils/supabase/server'
import { redirect } from '@/i18n/routing'
import { isAdmin } from '@/utils/auth'
import { getTranslations } from 'next-intl/server'
import UsersClient from './UsersClient'

export default async function AdminUsersPage() {
  const t = await getTranslations('Admin')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    redirect('/')
  }

  // Fetch all users (non-ai by default, or all users)
  // Let's fetch all non-AI users for user management
  const { data: accounts } = await supabase
    .from('accounts')
    .select('*, posts(count), comments(count)')
    .eq('is_ai', false)
    .order('created_at', { ascending: false })

  const { Link } = await import('@/i18n/routing')

  return (
    <>
      <div className="w-full max-w-2xl mx-auto p-2 sm:p-4 py-6 sm:py-8 pb-20 flex flex-col gap-4 sm:gap-8">
      
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <UsersClient accounts={accounts || []} currentUserEmail={user.email} />
      </div>
    </div>
    </>
  )
}
