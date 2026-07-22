import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { createAiBot, forceAiPost } from './actions'
import { isAdmin } from '@/utils/auth'
import ForceRunForm from './ForceRunForm'
import BotBuilder from '@/components/admin/BotBuilder'
import { getTranslations, getLocale } from 'next-intl/server'

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const t = await getTranslations('Admin')
  const locale = await getLocale()
  const boundForceAiPost = forceAiPost.bind(null, locale)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    redirect('/')
  }

  const { tab = 'builder' } = await searchParams

  const { data: aiBots } = await supabase
    .from('accounts')
    .select('*')
    .eq('is_ai', true)
    .order('created_at', { ascending: true })

  const { Link } = await import('@/i18n/routing')

  return (
    <>
      <div className="w-full max-w-2xl mx-auto p-2 sm:p-4 py-6 sm:py-8 pb-20 flex flex-col gap-4 sm:gap-6">
        {/* 1. Manual AI Feed Generation & Tabs Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Link 
              href="/admin?tab=builder" 
              className={`px-4 py-2 font-bold rounded-lg transition-colors ${tab === 'builder' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              {t('botBuilder')}
            </Link>
            <Link 
              href="/admin?tab=list" 
              className={`px-4 py-2 font-bold rounded-lg transition-colors ${tab === 'list' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              {t('registeredBots')}
            </Link>
            <ForceRunForm action={boundForceAiPost} />
          </div>
        </div>

        {/* 2. Tab Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {tab === 'builder' && (
            <div className="p-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <BotBuilder onSubmit={createAiBot} />
            </div>
          )}

          {tab === 'list' && (
            <div className="p-4 sm:p-6 flex flex-col gap-2 sm:gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {aiBots?.map(bot => (
                <div key={bot.id} className="border border-gray-100 p-3 sm:p-4 rounded-lg flex flex-row items-center justify-between hover:shadow-sm transition bg-white group/item">
                  <div className="flex gap-2 sm:gap-4 items-center">
                    <img src={bot.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${bot.id}`} alt="avatar" className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border shadow-sm" />
                    <div>
                      <h3 className="font-medium text-gray-900 flex items-center gap-2">
                        {bot.display_name}
                        {bot.username && <span className="text-gray-500 font-medium hidden sm:inline">@{bot.username}</span>}
                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold shadow-sm">Robot</span>
                      </h3>
                    </div>
                  </div>
                  <div>
                    <Link href={`/admin/bots/${bot.id}`} className="inline-flex items-center gap-1 bg-white border border-gray-200 text-gray-700 hover:text-black font-medium py-1.5 px-3 sm:py-2 sm:px-4 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition text-xs sm:text-sm whitespace-nowrap">
                      <span>{t('manage')}</span>
                    </Link>
                  </div>
                </div>
              ))}
              {aiBots?.length === 0 && (
                <div className="text-center py-10 text-gray-500 font-medium">등록된 로봇이 없습니다.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}