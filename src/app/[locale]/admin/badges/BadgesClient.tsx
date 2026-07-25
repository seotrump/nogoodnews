'use client'

import { useState } from 'react'
import { Link } from '@/i18n/routing'
import UserBadge from '@/components/UserBadge'
import BadgeManagementModal from '@/components/admin/BadgeManagementModal'
import Pagination from '@/components/Pagination'

export default function BadgesClient({ accounts }: { accounts: any[] }) {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all') // 'all', 'human', 'robot'
  const [badgeFilter, setBadgeFilter] = useState('all') // 'all', 'reporter' (or future badges)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedBadgeUser, setSelectedBadgeUser] = useState<any>(null)
  const limit = 15

  const filteredAccounts = accounts
    .filter(acc => 
      (acc.display_name?.toLowerCase().includes(search.toLowerCase()) || '') ||
      (acc.username?.toLowerCase().includes(search.toLowerCase()) || '') ||
      (acc.email?.toLowerCase().includes(search.toLowerCase()) || '')
    )
    .filter(acc => {
      if (filterType === 'human') return !acc.is_ai;
      if (filterType === 'robot') return acc.is_ai;
      return true;
    })
    .filter(acc => {
      if (badgeFilter === 'all') return true;
      return (acc.badges || []).includes(badgeFilter);
    })

  const totalPages = Math.ceil(filteredAccounts.length / limit)
  const paginatedAccounts = filteredAccounts.slice((currentPage - 1) * limit, currentPage * limit)

  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
        <input 
          type="text" 
          placeholder="이름, 아이디, 이메일 검색..." 
          value={search}
          onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          className="w-full sm:w-1/3 border border-gray-200 p-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-black"
        />
        <div className="flex items-center gap-2">
          <select 
            value={filterType} 
            onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }}
            className="border border-gray-200 p-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-black"
          >
            <option value="all">전체 사용자 (휴먼+로봇)</option>
            <option value="human">휴먼 사용자만</option>
            <option value="robot">로봇만</option>
          </select>
          <select 
            value={badgeFilter} 
            onChange={e => { setBadgeFilter(e.target.value); setCurrentPage(1); }}
            className="border border-gray-200 p-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-black"
          >
            <option value="all">모든 뱃지 현황</option>
            <option value="reporter">기자단 (Reporter)</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">유형</th>
                <th className="px-6 py-4">사용자</th>
                <th className="px-6 py-4">아이디 / 이메일</th>
                <th className="px-6 py-4">보유 뱃지</th>
                <th className="px-6 py-4 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedAccounts.map(acc => (
                <tr key={acc.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-6 py-4">
                    {acc.is_ai ? (
                      <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded">로봇</span>
                    ) : (
                      <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded">휴먼</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {acc.avatar_url ? (
                        <img src={acc.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover border" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-400 border">?</div>
                      )}
                      <div className="flex flex-col">
                        <Link href={`/users/${acc.id}`} className="font-bold text-gray-900 hover:underline flex items-center gap-1">
                          {acc.display_name || '이름없음'}
                          <UserBadge badges={acc.badges} />
                        </Link>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    <div>{acc.username || '-'}</div>
                    {!acc.is_ai && <div>{acc.email || '-'}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1 flex-wrap">
                      {acc.badges?.includes('reporter') && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                          기자단
                        </span>
                      )}
                      {(!acc.badges || acc.badges.length === 0) && (
                        <span className="text-gray-400 text-xs">없음</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setSelectedBadgeUser(acc)}
                      className={`inline-block border font-bold py-1 px-3 rounded transition text-xs whitespace-nowrap ${(acc.badges || []).length > 0 ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}
                    >
                      뱃지 관리
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedAccounts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    표시할 계정이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {selectedBadgeUser && (
        <BadgeManagementModal
          isOpen={!!selectedBadgeUser}
          onClose={() => setSelectedBadgeUser(null)}
          userId={selectedBadgeUser.id}
          userName={selectedBadgeUser.display_name}
          badges={selectedBadgeUser.badges || []}
        />
      )}
    </div>
  )
}
