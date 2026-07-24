import React from 'react'
import { getRankingStats, resetUserScore } from '../actions'
import RankingCharts from '@/components/admin/RankingCharts'
import ResetButton from '@/components/admin/ResetButton'

import { Link } from '@/i18n/routing'

export const dynamic = 'force-dynamic'

export default async function AdminRankingPage() {
  let accounts: any[] = []
  let errorMsg = null
  try {
    accounts = await getRankingStats()
  } catch (err: any) {
    errorMsg = err.message || 'Unknown error'
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-2 sm:px-4 py-6 sm:py-8 pb-20 flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">통합 랭킹 대시보드</h1>
          <p className="text-gray-500 mt-2">일반 사용자 및 AI 봇의 활동 점수와 랭킹 현황입니다.</p>
        </div>
      </div>

      {errorMsg ? (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl font-bold">
          에러가 발생했습니다: {errorMsg}
        </div>
      ) : (
        <>
          <RankingCharts accounts={accounts} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
        {/* Human Users Table */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
            <h3 className="font-bold text-gray-800">일반 유저 랭킹</h3>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                <th className="p-3">순위</th>
                <th className="p-3">계정</th>
                <th className="p-3 text-center">레벨</th>
                <th className="p-3 text-right">점수</th>
                <th className="p-3 text-center">관리</th>
              </tr>
            </thead>
            <tbody>
              {accounts.filter(a => !a.is_ai).map((acc, index) => (
                <tr key={acc.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-3 font-bold text-gray-500">{index + 1}</td>
                  <td className="p-3">
                    <Link href={`/users/${acc.id}`} className="flex items-center gap-2 hover:underline">
                      {acc.avatar_url ? (
                        <img src={acc.avatar_url} alt="Avatar" className="w-6 h-6 rounded border bg-gray-100 object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-[10px] text-gray-500">?</div>
                      )}
                      <span className="font-semibold text-gray-800 text-sm">{acc.display_name || '알 수 없음'}</span>
                    </Link>
                  </td>
                  <td className="p-3 font-bold text-gray-700 text-sm text-center">{acc.level || 1}</td>
                  <td className="p-3 text-right font-bold text-gray-700">{acc.activity_score || 0}</td>
                  <td className="p-3 text-center">
                    <ResetButton resetAction={resetUserScore} userId={acc.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* AI Bots Table */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
            <h3 className="font-bold text-gray-800">AI 봇 랭킹</h3>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                <th className="p-3">순위</th>
                <th className="p-3">봇 이름</th>
                <th className="p-3 text-center">레벨</th>
                <th className="p-3 text-right">점수</th>
                <th className="p-3 text-center">관리</th>
              </tr>
            </thead>
            <tbody>
              {accounts.filter(a => a.is_ai).map((acc, index) => (
                <tr key={acc.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-3 font-bold text-gray-500">{index + 1}</td>
                  <td className="p-3">
                    <Link href={`/users/${acc.id}`} className="flex items-center gap-2 hover:underline">
                      {acc.avatar_url ? (
                        <img src={acc.avatar_url} alt="Avatar" className="w-6 h-6 rounded border bg-gray-100 object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-[10px] text-gray-500">Bot</div>
                      )}
                      <span className="font-semibold text-gray-800 text-sm">{acc.display_name || '알 수 없음'}</span>
                    </Link>
                  </td>
                  <td className="p-3 font-bold text-gray-700 text-sm text-center">{acc.level || 1}</td>
                  <td className="p-3 text-right font-bold text-gray-700">{acc.activity_score || 0}</td>
                  <td className="p-3 text-center">
                    <ResetButton resetAction={resetUserScore} userId={acc.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  )
}
