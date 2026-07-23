import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { createAiBot, forceAiPost } from './actions'
import { isAdmin } from '@/utils/auth'
import ForceRunForm from './ForceRunForm'
import BotBuilder from '@/components/admin/BotBuilder'
import AdminFilter from '@/components/admin/AdminFilter'
import AutoBotButton from '@/components/admin/AutoBotButton'
import AdminNav from '@/components/admin/AdminNav'
import Pagination from '@/components/Pagination'
import { getTranslations, getLocale } from 'next-intl/server'

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string, page?: string, query?: string, category?: string }> }) {
  const t = await getTranslations('Admin')
  const locale = await getLocale()
  const boundForceAiPost = forceAiPost.bind(null, locale)
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

  if (tab === 'list') {
    let dbQuery = supabase
      .from('accounts')
      .select('*', { count: 'exact' })
      .eq('is_ai', true)
      .order('created_at', { ascending: false })

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

  const { Link } = await import('@/i18n/routing')

  return (
    <>
      <div className="w-full max-w-4xl mx-auto p-2 sm:p-4 py-6 sm:py-8 pb-20 flex flex-col gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* 1. Manual AI Feed Generation & Tabs Header */}
        <div className="mb-4">
          <AdminNav />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Link 
              href="/admin?tab=list" 
              className={`px-3 py-1.5 text-sm font-bold rounded transition-colors ${tab === 'list' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              목록 보기
            </Link>
            <Link 
              href="/admin?tab=builder" 
              className={`px-3 py-1.5 text-sm font-bold rounded transition-colors ${tab === 'builder' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              로봇 생성
            </Link>
            <ForceRunForm action={boundForceAiPost} />
          </div>
          <AutoBotButton />
        </div>

        {/* 2. Tab Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-2">
          {tab === 'builder' && (
            <div className="p-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <BotBuilder onSubmit={createAiBot} />
            </div>
          )}

          {tab === 'list' && (
            <div className="p-4 sm:p-6 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              <AdminFilter />

              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left border-collapse sm:min-w-[800px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 font-bold uppercase tracking-wider">
                      <th className="p-3 w-16 text-center">등급</th>
                      <th className="p-3 w-32 sm:w-40">닉네임</th>
                      <th className="p-3 w-16 text-center">얼굴</th>
                      <th className="p-3 w-28 sm:w-32">아이디</th>
                      <th className="p-3 w-32 hidden sm:table-cell">전문성</th>
                      <th className="p-3 hidden sm:table-cell">정체성</th>
                      <th className="p-3 w-20 text-center">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {aiBots?.map(userItem => {
                      const advancedSettings = userItem.advanced_settings || {};
                      const identityText = userItem.is_ai ? (advancedSettings.coreIdentity || '-') : (userItem.bio || '-');
                      const categoryText = userItem.is_ai ? (userItem.category || '-') : '일반 유저';
                      const badgeClass = 'bg-purple-100 text-purple-700';
                      
                      return (
                        <tr key={userItem.id} className="hover:bg-gray-50 transition group">
                          <td className="p-3 text-center">
                            <span className={`${badgeClass} px-2 py-1 rounded text-xs font-bold inline-block min-w-[32px]`}>
                              {userItem.level || 1}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-gray-900 text-sm block truncate max-w-[100px] sm:max-w-none">{userItem.display_name}</span>
                          </td>
                          <td className="p-3 text-center">
                            <img src={userItem.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${userItem.id}`} alt="avatar" className="w-8 h-8 rounded-full border shadow-sm mx-auto bg-white object-cover min-w-[32px]" />
                          </td>
                          <td className="p-3">
                            {userItem.username ? <span className="text-gray-500 text-sm block truncate max-w-[100px] sm:max-w-none">@{userItem.username}</span> : <span className="text-gray-300 text-sm block truncate max-w-[100px] sm:max-w-none">@{userItem.id.substring(0, 8)}</span>}
                          </td>
                          <td className="p-3 hidden sm:table-cell">
                            <span className="text-sm font-medium text-gray-700 capitalize">{categoryText}</span>
                          </td>
                          <td className="p-3 hidden sm:table-cell">
                            <span className="text-xs text-gray-500 line-clamp-1" title={identityText}>{identityText}</span>
                          </td>
                          <td className="p-3 text-center">
                            <Link href={`/admin/bots/${userItem.id}`} className="inline-block bg-white border border-gray-200 text-gray-700 hover:text-black font-bold py-1 px-3 rounded hover:border-gray-400 transition text-xs whitespace-nowrap">
                              수정
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {aiBots?.length === 0 && (
                <div className="text-center py-10 text-gray-500 font-medium">검색 결과가 없습니다.</div>
              )}

              <Pagination totalPages={totalPages} currentPage={currentPage} />

            </div>
          )}
        </div>
      </div>
    </>
  )
}