import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import PremiumAnalyticsCharts from '@/components/PremiumAnalyticsCharts'
import { isAdmin } from '@/utils/auth'

export default async function AnalyticsDashboardPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    redirect('/')
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. 기본 유저 및 방문자 지표
  const { count: totalUsers } = await supabaseAdmin.from('accounts').select('*', { count: 'exact', head: true })
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { data: todayVisits } = await supabaseAdmin.from('site_visits').select('session_id').gte('created_at', today.toISOString())
  const uniqueTodayVisitors = new Set(todayVisits?.map(v => v.session_id)).size

  // 2. 누적 활동량 (게시글, 댓글, 리액션)
  const { count: totalPosts } = await supabaseAdmin.from('posts').select('*', { count: 'exact', head: true })
  const { count: totalComments } = await supabaseAdmin.from('comments').select('*', { count: 'exact', head: true })
  const { count: totalReactions } = await supabaseAdmin.from('reactions').select('*', { count: 'exact', head: true })

  // 3. DAU (최근 7일) 및 최고 인기 경로
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  sevenDaysAgo.setHours(0, 0, 0, 0)
  const { data: recentVisits } = await supabaseAdmin.from('site_visits').select('session_id, created_at, path').gte('created_at', sevenDaysAgo.toISOString()).order('created_at', { ascending: true })

  const dauMap: Record<string, Set<string>> = {}
  const pathMap: Record<string, number> = {}

  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo)
    d.setDate(d.getDate() + i)
    dauMap[d.toISOString().split('T')[0]] = new Set()
  }

  if (recentVisits) {
    recentVisits.forEach(v => {
      const dateStr = v.created_at.split('T')[0]
      if (dauMap[dateStr]) {
        dauMap[dateStr].add(v.session_id)
      }
      pathMap[v.path] = (pathMap[v.path] || 0) + 1
    })
  }

  const dauData = Object.keys(dauMap).map(date => ({
    date: date.slice(5), // MM-DD
    visits: dauMap[date].size
  }))

  const topPaths = Object.entries(pathMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([path, views]) => ({ path, views }))

  // 4. 유저 활동 퍼널 (가입 -> 글쓰기 -> 댓글쓰기)
  const { data: postAuthors } = await supabaseAdmin.from('posts').select('author_id')
  const { data: commentAuthors } = await supabaseAdmin.from('comments').select('author_id')
  const { data: reactionAuthors } = await supabaseAdmin.from('reactions').select('user_id')

  const uniquePostAuthors = new Set(postAuthors?.map(p => p.author_id)).size
  const uniqueCommentAuthors = new Set(commentAuthors?.map(c => c.author_id)).size
  const uniqueReactionAuthors = new Set(reactionAuthors?.map(r => r.user_id)).size

  const funnelData = [
    { name: '회원가입', value: totalUsers || 0 },
    { name: '리액션 경험', value: uniqueReactionAuthors },
    { name: '댓글 작성', value: uniqueCommentAuthors },
    { name: '게시글 작성', value: uniquePostAuthors }
  ]

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">서비스 통합 대시보드</h1>
        <p className="mt-3 text-lg text-gray-500">
          우리 서비스의 모든 핵심 성장 지표를 한눈에 파악하세요.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        {/* 요약 카드들 */}
        <StatCard title="총 가입 유저" value={`${totalUsers || 0} 명`} color="blue" icon={<UserIcon />} />
        <StatCard title="오늘 순방문자" value={`${uniqueTodayVisitors} 명`} color="green" icon={<EyeIcon />} />
        <StatCard title="총 게시글" value={`${totalPosts || 0} 개`} color="purple" icon={<DocumentIcon />} />
        <StatCard title="총 반응 (댓글/리액션)" value={`${(totalComments || 0) + (totalReactions || 0)} 개`} color="pink" icon={<HeartIcon />} />
      </div>

      <PremiumAnalyticsCharts 
        dauData={dauData} 
        topPaths={topPaths} 
        funnelData={funnelData} 
      />
    </div>
  )
}

function StatCard({ title, value, color, icon }: { title: string, value: string, color: string, icon: React.ReactNode }) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    purple: 'bg-indigo-500',
    pink: 'bg-pink-500',
  }
  
  return (
    <div className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl border border-gray-100">
      <div className="p-6">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${colorClasses[color as keyof typeof colorClasses]} rounded-xl p-4 shadow-inner`}>
            {icon}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-semibold text-gray-500 truncate">{title}</dt>
              <dd className="text-3xl font-bold text-gray-900 mt-1">{value}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

function UserIcon() {
  return (
    <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function DocumentIcon() {
  return (
    <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  )
}
