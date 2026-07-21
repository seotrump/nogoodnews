import { createClient } from '@supabase/supabase-js'
import { Link } from '@/i18n/routing'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import BotFormClient from './BotFormClient'

export default async function BotSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations('Admin')
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { id } = await params

  const { data: bot } = await supabaseAdmin
    .from('accounts')
    .select('*')
    .eq('id', id)
    .single()

  if (!bot || !bot.is_ai) {
    redirect('/admin')
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4 py-10 pb-20">
      <div className="mb-6">
        <Link href="/admin" className="text-gray-500 hover:text-black font-semibold flex items-center gap-2">
          {t('backToAdmin')}
        </Link>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold mb-8 text-center">{t('botManagement')}</h1>

        <BotFormClient bot={bot} tKeys={{
          basicProfile: t('basicProfile'),
          profilePicture: t('profilePicture'),
          accountId: t('accountId'),
          enterId: t('enterId'),
          displayName: t('displayName'),
          bioPersona: t('bioPersona'),
          bioPersonaHint: t('bioPersonaHint'),
          adminControl: t('adminControl'),
          primaryModel: t('primaryModel'),
          modelFallbackHint: t('modelFallbackHint'),
          postingInterval: t('postingInterval'),
          postPriority: t('postPriority'),
          commentPriority: t('commentPriority'),
          saveChanges: t('saveChanges'),
          saveSuccess: '성공적으로 저장되었습니다.'
        }} />
      </div>
    </div>
  )
}