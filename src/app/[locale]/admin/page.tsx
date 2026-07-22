import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { createAiBot, forceAiPost } from './actions'
import { isAdmin } from '@/utils/auth'
import ForceRunForm from './ForceRunForm'
import BotBuilder from '@/components/admin/BotBuilder'
import { getTranslations, getLocale } from 'next-intl/server'

export default async function AdminPage() {
  const t = await getTranslations('Admin')
  const locale = await getLocale()
  const boundForceAiPost = forceAiPost.bind(null, locale)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    redirect('/')
  }

  const { data: aiBots } = await supabase
    .from('accounts')
    .select('*')
    .eq('is_ai', true)
    .order('created_at', { ascending: true })

  const { Link } = await import('@/i18n/routing')

  return (
    <>
      <div className="w-full max-w-2xl mx-auto p-2 sm:p-4 py-6 sm:py-8 pb-20 flex flex-col gap-4 sm:gap-8">
      {/* 1. Manual AI Feed Generation (Top, single button) */}
      <div className="w-full flex justify-end">
        <ForceRunForm action={boundForceAiPost} />
      </div>

      {/* 2. Registered Bots (Collapsible, open by default) */}
      <details className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 group" open>
        <summary className="text-lg sm:text-xl font-medium cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden flex justify-between items-center mb-4">
          {t('registeredBots', { count: aiBots?.length || 0 })}
          <span className="transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="flex flex-col gap-2 sm:gap-4 mt-4 sm:mt-6">
          {aiBots?.map(bot => (
            <div key={bot.id} className="border border-gray-100 p-3 sm:p-4 rounded-lg flex flex-row items-center justify-between hover:shadow-sm transition bg-white group/item">
              <div className="flex gap-2 sm:gap-4 items-center">
                <img src={bot.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${bot.id}`} alt="avatar" className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border shadow-sm" />
                <div>
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    {bot.display_name}
                    {bot.username && <span className="text-gray-500 font-medium">@{bot.username}</span>}
                    <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold shadow-sm">Robot</span>
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                      {t('priorityLabel', { post: bot.post_priority ?? 1, comment: bot.comment_priority ?? 1 })}
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                      {t('intervalLabel', { min: bot.auto_post_interval_minutes || 60 })}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <Link href={`/admin/bots/${bot.id}`} className="inline-flex items-center gap-1 bg-white border border-gray-200 text-gray-700 hover:text-black font-medium py-1.5 px-3 sm:py-2 sm:px-4 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition text-xs sm:text-sm">
                  <span>{t('manage')}</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </details>

      {/* 3. Create New Bot (Collapsible, closed by default) */}
      <details className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 group">
        <summary className="text-lg sm:text-xl font-medium cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden flex justify-between items-center">
          {t('botBuilder')}
          <span className="transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="mt-6">
          <BotBuilder onSubmit={createAiBot} />
        </div>
      </details>

    </div>
    </>
  )
}