import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/utils/auth'
import { getTranslations } from 'next-intl/server'
import UsersClient from './UsersClient'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export default async function AdminUsersPage() {
  const t = await getTranslations('Admin')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    redirect('/')
  }

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
      }
    }
  )

  // 로컬 Supabase Gotrue 컨테이너의 500 에러(Database error finding users)로 인해 임시 비활성화
  // 추후 프로덕션 환경이나 로컬 DB 수정 후 다시 활성화
  let authUsers: any[] = []

  // Fetch all non-AI users for user management, including posts, comments, reactions
  const { data: accounts } = await supabase
    .from('accounts')
    .select('*, posts(count), comments(count), reactions(count)')
    .eq('is_ai', false)
    .order('created_at', { ascending: false })

  // Merge auth info into accounts
  const mergedAccounts = accounts?.map(acc => {
    const authUser = authUsers?.find(u => u.id === acc.id)
    return {
      ...acc,
      last_sign_in_at: authUser?.last_sign_in_at || null
    }
  }) || []

  const { Link } = await import('@/i18n/routing')

  return (
    <>
      <div className="w-full max-w-4xl mx-auto p-2 sm:p-4 py-6 sm:py-8 pb-20 flex flex-col gap-4 sm:gap-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-4 py-2 font-bold rounded-lg bg-black text-white">
              휴먼 목록
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mt-2">
          <UsersClient accounts={mergedAccounts} currentUserEmail={user.email} />
        </div>
      </div>
    </>
  )
}
