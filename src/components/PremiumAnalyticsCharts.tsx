'use client'

import React, { useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  Cell
} from 'recharts'

type PremiumAnalyticsChartsProps = {
  dauData: { date: string; visits: number }[]
  topPaths: { path: string; views: number }[]
  funnelData: { name: string; value: number }[]
  advancedMetrics?: {
    stickiness: string
    powerUsersCount: number
    actionsPerUser: string
    mau: number
  }
}

export default function PremiumAnalyticsCharts({ dauData, topPaths, funnelData, advancedMetrics }: PremiumAnalyticsChartsProps) {
  const [activeTab, setActiveTab] = useState<'advanced' | 'funnel' | 'overview' | 'paths'>(advancedMetrics ? 'advanced' : 'funnel')

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 sm:p-8">
      {/* 탭 네비게이션 */}
      <div className="flex space-x-2 mb-8 border-b border-gray-100 pb-4 overflow-x-auto">
        {advancedMetrics && (
          <TabButton 
            active={activeTab === 'advanced'} 
            onClick={() => setActiveTab('advanced')}
            label="👑 핵심 성장 지표"
          />
        )}
        <TabButton 
          active={activeTab === 'funnel'} 
          onClick={() => setActiveTab('funnel')}
          label="유저 참여 퍼널"
        />
        <TabButton 
          active={activeTab === 'overview'} 
          onClick={() => setActiveTab('overview')}
          label="주간 트래픽 (DAU)"
        />
        <TabButton 
          active={activeTab === 'paths'} 
          onClick={() => setActiveTab('paths')}
          label="인기 페이지"
        />
      </div>

      {/* 차트 영역 */}
      <div className="h-[400px] w-full">
        {activeTab === 'overview' && (
          <div className="h-full flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 mb-6">최근 7일 순방문자 추이</h3>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dauData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#374151', marginBottom: '4px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="visits" 
                  name="방문자 수" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorVisits)" 
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'funnel' && (
          <div className="h-full flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 mb-6">유저 참여도 퍼널 (가입부터 글쓰기까지)</h3>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart layout="vertical" data={funnelData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontWeight: 600 }} width={100} />
                <Tooltip 
                  cursor={{fill: '#f9fafb'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="value" name="유저 수" barSize={32} radius={[0, 8, 8, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#cbd5e1', '#94a3b8', '#64748b', '#334155'][index % 4]} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'paths' && (
          <div className="h-full flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 mb-6">인기 방문 페이지 TOP 5</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPaths} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
                <YAxis dataKey="path" type="category" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 13 }} width={120} />
                <Tooltip 
                  cursor={{fill: '#f9fafb'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="views" name="조회수" fill="#10b981" barSize={32} radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'advanced' && advancedMetrics && (
          <div className="h-full flex flex-col space-y-6 overflow-y-auto pr-2 pb-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">프리미엄 핵심 성장 지표 (최근 30일 기준)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-gray-700 font-bold">스티키니스 (Stickiness)</h4>
                  <span className="bg-gray-100 text-gray-600 text-[11px] px-2.5 py-1 rounded-full font-bold tracking-wide uppercase">DAU / MAU</span>
                </div>
                <div className="text-4xl font-extrabold text-indigo-600 mb-3">{advancedMetrics.stickiness}%</div>
                <p className="text-sm text-gray-500 leading-relaxed font-medium">
                  한 달 접속자 중 얼마나 많은 유저가 매일 접속하는지 보여줍니다. 통상 20%를 넘으면 대성공으로 평가받습니다.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-gray-700 font-bold">광팬 지수 (Power Users)</h4>
                  <span className="bg-gray-100 text-gray-600 text-[11px] px-2.5 py-1 rounded-full font-bold tracking-wide uppercase">L30 &gt; 15</span>
                </div>
                <div className="text-4xl font-extrabold text-pink-600 mb-3">{advancedMetrics.powerUsersCount}명</div>
                <p className="text-sm text-gray-500 leading-relaxed font-medium">
                  최근 30일 중 15일 이상 출석한 핵심 유저 수입니다. 커뮤니티의 분위기를 주도하는 상위 1% VIP입니다.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-gray-700 font-bold">평균 인게이지먼트</h4>
                  <span className="bg-gray-100 text-gray-600 text-[11px] px-2.5 py-1 rounded-full font-bold tracking-wide uppercase">Actions / MAU</span>
                </div>
                <div className="text-4xl font-extrabold text-emerald-600 mb-3">{advancedMetrics.actionsPerUser}회</div>
                <p className="text-sm text-gray-500 leading-relaxed font-medium">
                  유저 1명당 평균적으로 발생시키는 글, 댓글, 리액션의 합계입니다. 유저 참여도를 판단하는 핵심 기준입니다.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-gray-700 font-bold">월간 활성 유저</h4>
                  <span className="bg-gray-100 text-gray-600 text-[11px] px-2.5 py-1 rounded-full font-bold tracking-wide uppercase">MAU</span>
                </div>
                <div className="text-4xl font-extrabold text-amber-600 mb-3">{advancedMetrics.mau}명</div>
                <p className="text-sm text-gray-500 leading-relaxed font-medium">
                  최근 30일 동안 우리 서비스에 1번이라도 접속한 순수 활성 방문자의 총합입니다.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TabButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
        active 
          ? 'bg-black text-white shadow-md' 
          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  )
}
