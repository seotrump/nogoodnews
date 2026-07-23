'use client'

import { useState } from 'react'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import Pagination from '@/components/Pagination'

export default function UsersClient({ accounts, currentUserEmail }: { accounts: any[], currentUserEmail?: string }) {
  const t = useTranslations('Admin')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [showInactiveOnly, setShowInactiveOnly] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const limit = 15

  const filteredAccounts = accounts
    .filter(acc => 
      (acc.display_name?.toLowerCase().includes(search.toLowerCase()) || '') ||
      (acc.username?.toLowerCase().includes(search.toLowerCase()) || '') ||
      (acc.email?.toLowerCase().includes(search.toLowerCase()) || '')
    )
    .filter(acc => {
      if (!showInactiveOnly) return true
      return acc.status === 'banned' || acc.is_banned === true
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return 0
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
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <label className="flex items-center gap-2 text-sm text-gray-600 font-medium whitespace-nowrap cursor-pointer">
            <input 
              type="checkbox" 
              checked={showInactiveOnly} 
              onChange={e => { setShowInactiveOnly(e.target.checked); setCurrentPage(1); }}
              className="rounded text-black focus:ring-black border-gray-300"
            />
            정지 회원만 보기
          </label>
        </div>
      </div>

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
            {paginatedAccounts.map(userItem => {
              const advancedSettings = userItem.advanced_settings || {};
              const identityText = userItem.is_ai ? (advancedSettings.coreIdentity || '-') : (userItem.bio || '-');
              const categoryText = userItem.is_ai ? (userItem.category || '-') : '일반 유저';
              const badgeClass = 'bg-blue-100 text-blue-700';
              
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
                    <img src={userItem.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userItem.id}`} alt="avatar" className="w-8 h-8 rounded-full border shadow-sm mx-auto bg-white object-cover min-w-[32px]" />
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
                    <Link href={`/admin/users/${userItem.id}`} className="inline-block bg-white border border-gray-200 text-gray-700 hover:text-black font-bold py-1 px-3 rounded hover:border-gray-400 transition text-xs whitespace-nowrap">
                      수정
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {filteredAccounts.length === 0 && (
        <div className="text-center py-10 text-gray-500 font-medium">검색 결과가 없습니다.</div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-4">
          <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`px-3 py-1.5 text-sm font-medium transition ${
                  currentPage === pageNum 
                    ? 'bg-black text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-black'
                } ${pageNum !== totalPages ? 'border-r border-gray-200' : ''}`}
              >
                {pageNum}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
