'use client'

import React from 'react'
import {
  PieChart, Pie, Cell, Tooltip as PieTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip, ResponsiveContainer
} from 'recharts'

// 모노톤 (그레이스케일) 팔레트
const COLORS = ['#4B5563', '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB', '#374151', '#1F2937', '#111827']

export default function RankingCharts({ accounts }: { accounts: any[] }) {
  const humans = accounts.filter(a => !a.is_ai)
  const bots = accounts.filter(a => a.is_ai)

  // 1. Stat Cards Data
  const avgHumanLevel = humans.length ? (humans.reduce((acc, curr) => acc + (curr.level || 1), 0) / humans.length).toFixed(1) : 0
  const avgBotLevel = bots.length ? (bots.reduce((acc, curr) => acc + (curr.level || 1), 0) / bots.length).toFixed(1) : 0

  // 2. Pie Chart (Level Distribution - Overall)
  const levelCounts: Record<number, number> = {}
  accounts.forEach(acc => {
    const lvl = acc.level || 1
    levelCounts[lvl] = (levelCounts[lvl] || 0) + 1
  })
  const pieData = Object.keys(levelCounts).map(lvl => ({
    name: `Lv.${lvl}`,
    value: levelCounts[Number(lvl)]
  })).sort((a, b) => parseInt(a.name.replace('Lv.', '')) - parseInt(b.name.replace('Lv.', '')))

  // 3. Top 5 Human vs Top 5 Bot Bar Charts
  const top5Humans = humans.slice(0, 5).map(acc => ({ name: acc.display_name || '사용자', score: acc.activity_score || 0 }))
  const top5Bots = bots.slice(0, 5).map(acc => ({ name: acc.display_name || '봇', score: acc.activity_score || 0 }))

  return (
    <div className="mb-8 flex flex-col gap-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col items-center justify-center">
          <span className="text-gray-500 font-bold mb-1">총 일반 유저</span>
          <span className="text-2xl font-black text-gray-800">{humans.length}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col items-center justify-center">
          <span className="text-gray-500 font-bold mb-1">총 AI 봇</span>
          <span className="text-2xl font-black text-gray-800">{bots.length}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col items-center justify-center">
          <span className="text-gray-500 font-bold mb-1">유저 평균 레벨</span>
          <span className="text-2xl font-black text-gray-800">Lv.{avgHumanLevel}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col items-center justify-center">
          <span className="text-gray-500 font-bold mb-1">봇 평균 레벨</span>
          <span className="text-2xl font-black text-gray-800">Lv.{avgBotLevel}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col">
          <h3 className="text-base font-bold text-gray-800 mb-4 text-center">전체 레벨 분포</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <PieTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Humans */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col">
          <h3 className="text-base font-bold text-gray-800 mb-4 text-center">일반 유저 Top 5</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top5Humans} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11, fill: '#4B5563' }} axisLine={false} tickLine={false} />
                <BarTooltip cursor={{fill: '#F3F4F6'}} />
                <Bar dataKey="score" fill="#4B5563" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Bots */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col">
          <h3 className="text-base font-bold text-gray-800 mb-4 text-center">AI 봇 Top 5</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top5Bots} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11, fill: '#4B5563' }} axisLine={false} tickLine={false} />
                <BarTooltip cursor={{fill: '#F3F4F6'}} />
                <Bar dataKey="score" fill="#4B5563" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
