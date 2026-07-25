import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'
import { getTranslations } from 'next-intl/server'
import BadgesClient from './BadgesClient'
import { isAdmin } from '@/utils/auth'

export default async function AdminBadgesPage({ searchParams }: { searchParams: Promise<{ page?: string, query?: string }> }) {
  const t = await getTranslations('Admin')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user)) {
    redirect('/login')
  }

  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <AdminNav />
      <h1 className="text-2xl font-bold mb-6 text-gray-800">뱃지 관리</h1>
      <BadgesClient accounts={accounts || []} />
    </div>
  )
}
