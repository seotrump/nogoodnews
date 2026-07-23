import { createClient } from '@supabase/supabase-js'
import { Link, redirect } from '@/i18n/routing'
import { getTranslations } from 'next-intl/server'
import BotBuilder from '@/components/admin/BotBuilder'
import { updateAiBotSettings } from '../../actions'

export default async function BotSettingsPage({ params }: { params: Promise<{ id: string, locale: string }> }) {
  const t = await getTranslations('Admin')
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { id, locale } = await params

  const { data: bot } = await supabaseAdmin
    .from('accounts')
    .select('*')
    .eq('id', id)
    .single()

  if (!bot || !bot.is_ai) {
    redirect({ href: '/admin', locale })
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 py-10 pb-20">
      <div className="mb-6">
        <Link href="/admin?tab=list" className="text-gray-500 hover:text-black font-bold text-sm">
          &larr; 로봇 목록
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-center">{t('botManagement')} - {bot.display_name}</h1>
      </div>

      <BotBuilder initialData={bot} onSubmit={updateAiBotSettings} />
    </div>
  )
}