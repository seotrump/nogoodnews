import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { createAiBot } from '../actions'
import { isAdmin } from '@/utils/auth'
import { Link } from '@/i18n/routing'
import BotBuilder from '@/components/admin/BotBuilder'
import AdminFilter from '@/components/admin/AdminFilter'
import AutoBotButton from '@/components/admin/AutoBotButton'
import AdminNav from '@/components/admin/AdminNav'
import Pagination from '@/components/Pagination'
import { getTranslations, getLocale } from 'next-intl/server'
import UserBadge from '@/components/UserBadge'
import RobotTableClient from '@/components/admin/RobotTableClient'

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string, page?: string, query?: string, category?: string }> }) {
  const t = await getTranslations('Admin')
  const locale = await getLocale()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    redirect('/')
  }

    const { tab = 'list', page = '1', query = '', category = 'all' } = await searchParams
  const currentPage = parseInt(page, 10) || 1
  const limit = 15
  const offset = (currentPage - 1) * limit

  // 리스트 탭(로봇)일 때만 데이터를 가져옵니다.
  let aiBots: any[] = []
  let count: number | null = 0
  let totalPages = 0

  if (tab === 'list' || tab === 'suspended' || tab === 'badges') {
    let dbQuery = supabase
      .from('accounts')
      .select('*', { count: 'exact' })
      .eq('is_ai', true)
      .order('ai_model_provider', { ascending: false, nullsFirst: false })
      .order('username', { ascending: true })

    if (tab === 'suspended') {
      dbQuery = dbQuery.eq('status', 'banned')
    } else {
      dbQuery = dbQuery.or('status.neq.banned,status.is.null')
    }

    if (query) {
      dbQuery = dbQuery.or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
    }
    
    if (category && category !== 'all') {
      dbQuery = dbQuery.eq('category', category)
    }

    const { data, count: dbCount } = await dbQuery.range(offset, offset + limit - 1)
    aiBots = data || []
    count = dbCount
    totalPages = Math.ceil((count || 0) / limit)
  }

  const { Link: NextLink } = await import('@/i18n/routing')
  const { default: RobotActionButtons } = await import('@/components/admin/RobotActionButtons')

  return (
    <>
      <div className="w-full max-w-4xl mx-auto p-2 sm:p-4 py-6 sm:py-8 pb-20 flex flex-col gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* 1. Manual AI Feed Generation & Tabs Header */}
        <div className="flex flex-row items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link 
              href="/admin/robot?tab=list" 
              className={`flex items-center justify-center px-3 h-8 text-sm font-bold rounded transition-colors ${tab === 'list' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              로봇 목록
            </Link>
            <Link 
            href="/admin/robot?tab=suspended" 
            className={`flex items-center justify-center px-3 h-8 text-sm font-bold rounded transition-colors ${tab === 'suspended' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            정지 로봇
          </Link>
          <Link 
            href="/admin/robot?tab=badges" 
            className={`flex items-center justify-center px-3 h-8 text-sm font-bold rounded transition-colors ${tab === 'badges' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'}`}
          >
            로봇 뱃지
          </Link>
            <Link 
              href="/admin/robot?tab=builder" 
              className={`flex items-center justify-center px-3 h-8 text-sm font-bold rounded transition-colors ${tab === 'builder' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              로봇 빌더
            </Link>
            <Link 
              href="/admin/robot?tab=portfolio" 
              className={`flex items-center justify-center px-3 h-8 text-sm font-bold rounded transition-colors ${tab === 'portfolio' ? 'bg-purple-600 text-white font-bold' : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'}`}
            >
              📊 포트폴리오
            </Link>
          </div>
          <AutoBotButton />
        </div>

        {/* 2. Tab Content */}
        {tab === 'portfolio' && (
          await (async () => {
            const { data: allBots } = await supabase
              .from('accounts')
              .select('id, display_name, username, tier, type_code, category, existence_category, avatar_url')
              .eq('is_ai', true)
              .order('created_at', { ascending: false });
            
            const PortfolioDashboardClient = (await import('@/components/admin/PortfolioDashboardClient')).default;
            return <PortfolioDashboardClient aiBots={allBots || []} />;
          })()
        )}

        {tab === 'builder' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <BotBuilder onSubmit={createAiBot} />
          </div>
        )}

        {(tab === 'list' || tab === 'suspended' || tab === 'badges') && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AdminFilter />
            <RobotTableClient aiBots={aiBots || []} currentTab={tab} />
            <Pagination totalPages={totalPages} currentPage={currentPage} />
          </div>
        )}
      </div>
    </>
  )
}