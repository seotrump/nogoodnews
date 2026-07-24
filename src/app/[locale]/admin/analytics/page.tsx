import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AnalyticsChart from '@/components/AnalyticsChart'
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

  // 1. 총 가입자 수
  const { count: totalUsers } = await supabaseAdmin
    .from('accounts')
    .select('*', { count: 'exact', head: true })

  // 2. 오늘 방문자 수 (세션 기준 고유 방문자)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const { data: todayVisits } = await supabaseAdmin
    .from('site_visits')
    .select('session_id')
    .gte('created_at', today.toISOString())

  const uniqueTodayVisitors = new Set(todayVisits?.map(v => v.session_id)).size

  // 3. DAU 데이터 (최근 7일)
  // Note: Supabase JS doesn't support complex group by without RPC easily, so we fetch last 7 days and process in memory (fine for small scale)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const { data: recentVisits } = await supabaseAdmin
    .from('site_visits')
    .select('session_id, created_at, path')
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: true })

  // 날짜별 그룹화
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
      
      // 경로별 카운트
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

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">사이트 분석 대시보드</h1>
        <p className="mt-2 text-sm text-gray-600">
          복잡한 외부 툴 대신 서비스 내부에 최적화된 핵심 지표를 확인하세요.
        </p>
      </div>

      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">고도화된 PostHog 통합 대시보드</h2>
        {process.env.NEXT_PUBLIC_POSTHOG_DASHBOARD_URL ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden w-full" style={{ height: '800px' }}>
            <iframe 
              src={process.env.NEXT_PUBLIC_POSTHOG_DASHBOARD_URL}
              width="100%" 
              height="100%" 
              frameBorder="0" 
              allowFullScreen
            ></iframe>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-blue-800">
            <h3 className="font-semibold text-lg mb-2">💡 PostHog 대시보드를 여기에 표시할 수 있습니다!</h3>
            <p className="mb-4 text-sm">PostHog에서 강력한 통합 대시보드(퍼널, 코호트 등)를 설정한 후, 이곳에 삽입(Embed)하여 바로 볼 수 있습니다.</p>
            <ol className="list-decimal list-inside space-y-2 text-sm font-medium">
              <li>PostHog에 로그인 후 대시보드를 생성하세요.</li>
              <li>대시보드 우측 상단 메뉴에서 <strong>'Share'</strong>를 클릭하고 <strong>'Share dashboard publicly'</strong>를 켭니다.</li>
              <li><strong>Embed</strong> 탭에 있는 iframe <code>src="..."</code> 안의 URL을 복사하세요.</li>
              <li>Vercel 환경변수에 <code>NEXT_PUBLIC_POSTHOG_DASHBOARD_URL</code>로 해당 URL을 추가하고 배포(Redeploy)해 주세요.</li>
            </ol>
          </div>
        )}
      </div>

      <div className="mb-8 border-t pt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-2">자체 라이트 대시보드 (기본 지표)</h2>
        <p className="text-sm text-gray-600 mb-6">위의 PostHog 연동 외에도 서버 자체에서 기본적으로 수집하는 지표입니다.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {/* 요약 카드 1 */}
        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">총 가입 유저</dt>
                  <dd className="text-2xl font-bold text-gray-900">{totalUsers || 0} 명</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* 요약 카드 2 */}
        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">오늘 방문자 (순수)</dt>
                  <dd className="text-2xl font-bold text-gray-900">{uniqueTodayVisitors} 명</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnalyticsChart dauData={dauData} topPaths={topPaths} />
    </div>
  )
}
