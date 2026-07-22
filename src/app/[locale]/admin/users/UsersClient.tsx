'use client'

import { useState } from 'react'
import { toggleUserBan, toggleUserAdmin, changeUserTier, changeUserLevel } from './actions'
import { toast } from 'react-hot-toast'
import { ADMIN_EMAIL } from '@/utils/auth'
import { useTranslations } from 'next-intl'

export default function UsersClient({ accounts, currentUserEmail }: { accounts: any[], currentUserEmail?: string }) {
  const t = useTranslations('Admin')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [showInactiveOnly, setShowInactiveOnly] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const LEVEL_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

  // 뱃지 상태 계산 함수
  const getUserStatus = (createdAt: string, lastSignInAt: string | null) => {
    const now = new Date()
    const created = new Date(createdAt)
    const lastSignIn = lastSignInAt ? new Date(lastSignInAt) : null

    const daysSinceCreated = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceCreated <= 3) return { type: 'New', color: 'bg-green-100 text-green-700' }

    if (!lastSignIn) return { type: 'Inactive', color: 'bg-red-100 text-red-700' }
    const daysSinceSignIn = (now.getTime() - lastSignIn.getTime()) / (1000 * 60 * 60 * 24)
    
    if (daysSinceSignIn <= 7) return { type: 'Active', color: 'bg-blue-100 text-blue-700' }
    if (daysSinceSignIn <= 30) return { type: 'Slipping', color: 'bg-yellow-100 text-yellow-700' }
    return { type: 'Inactive', color: 'bg-red-100 text-red-700' }
  }

  // 날짜 포맷 함수
  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return '기록 없음'
    const days = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
    if (days === 0) return '오늘'
    return `${days}일 전`
  }

  const filteredAccounts = accounts
    .filter(acc => 
      (acc.display_name?.toLowerCase().includes(search.toLowerCase()) || '') ||
      (acc.username?.toLowerCase().includes(search.toLowerCase()) || '') ||
      (acc.email?.toLowerCase().includes(search.toLowerCase()) || '')
    )
    .filter(acc => {
      if (!showInactiveOnly) return true
      const status = getUserStatus(acc.created_at, acc.last_sign_in_at)
      return status.type === 'Inactive'
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent_login':
          return new Date(b.last_sign_in_at || 0).getTime() - new Date(a.last_sign_in_at || 0).getTime()
        case 'most_posts':
          return (b.posts?.[0]?.count || 0) - (a.posts?.[0]?.count || 0)
        case 'most_comments':
          return (b.comments?.[0]?.count || 0) - (a.comments?.[0]?.count || 0)
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

  const handleToggleBan = async (userId: string, currentBanStatus: boolean) => {
    if (!confirm(currentBanStatus ? '정지 해제하시겠습니까? (Unban?)' : '정지하시겠습니까? (Ban?)')) return
    setIsPending(true)
    try {
      await toggleUserBan(userId, !currentBanStatus)
      toast.success(currentBanStatus ? '정지가 해제되었습니다. (Unbanned)' : '회원이 정지되었습니다. (Banned)')
    } catch (e) {
      toast.error('오류가 발생했습니다. (Error)')
    } finally {
      setIsPending(false)
    }
  }

  const handleToggleAdmin = async (userId: string, currentAdminStatus: boolean, email: string) => {
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      return toast.error('최고 관리자 권한은 변경할 수 없습니다.')
    }
    if (!confirm(currentAdminStatus ? '관리자 해제하시겠습니까? (Revoke admin?)' : '책임관리자로 지정하시겠습니까? (Assign admin?)')) return
    setIsPending(true)
    try {
      await toggleUserAdmin(userId, !currentAdminStatus)
      toast.success(currentAdminStatus ? '관리자 권한이 해제되었습니다. (Admin revoked)' : '책임관리자로 지정되었습니다. (Admin assigned)')
    } catch (e) {
      toast.error('오류가 발생했습니다. (Error)')
    } finally {
      setIsPending(false)
    }
  }

  const handleChangeTier = async (userId: string, currentTier: string) => {
    const newTier = currentTier === 'free' ? 'paid' : 'free'
    if (!confirm(`해당 회원을 ${newTier === 'paid' ? '유료' : '무료'}회원으로 변경하시겠습니까?`)) return
    setIsPending(true)
    try {
      await changeUserTier(userId, newTier)
      toast.success(`${newTier === 'paid' ? '유료(Paid)' : '무료(Free)'}회원으로 변경되었습니다.`)
    } catch (e) {
      toast.error('오류가 발생했습니다. (Error)')
    } finally {
      setIsPending(false)
    }
  }

  const handleLevelChange = async (userId: string, newLevel: number) => {
    setIsPending(true)
    try {
      await changeUserLevel(userId, newLevel)
      toast.success(`${newLevel}등급으로 변경되었습니다.`)
    } catch (e) {
      toast.error('오류가 발생했습니다. (Error)')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <input 
          type="text" 
          placeholder={t('searchUsersPlaceholder')} 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full sm:w-1/3 border border-gray-200 p-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-black"
        />
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <label className="flex items-center gap-2 text-sm text-gray-600 font-medium whitespace-nowrap cursor-pointer">
            <input 
              type="checkbox" 
              checked={showInactiveOnly} 
              onChange={e => setShowInactiveOnly(e.target.checked)}
              className="rounded text-black focus:ring-black border-gray-300"
            />
            비활동만
          </label>
          <select 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value)}
            className="w-full sm:w-auto border border-gray-200 p-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-black bg-white"
          >
            <option value="newest">최신 가입순</option>
            <option value="recent_login">최근 접속순</option>
            <option value="most_posts">피드 많은 순</option>
            <option value="most_comments">댓글 많은 순</option>
          </select>
        </div>
      </div>
      <div className="text-sm text-gray-500 font-medium whitespace-nowrap text-right mb-2">
        {t('totalUsers', { count: filteredAccounts.length })}
      </div>

      <div className="flex flex-col gap-1.5">
        {filteredAccounts.map(acc => {
          const isSuperAdmin = acc.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
          const effectiveLevel = isSuperAdmin ? 10 : (acc.level || 1)
          const statusBadge = getUserStatus(acc.created_at, acc.last_sign_in_at)
          return (
            <div key={acc.id} className="border-b border-gray-100 py-1.5 flex flex-col sm:flex-row gap-2 sm:items-center justify-between bg-white hover:bg-gray-50 transition">
              <div className="flex items-center gap-2">
                <div className="flex flex-col w-full">
                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                    <span className="font-semibold text-gray-900 text-sm">
                      <span className="mr-1">{LEVEL_EMOJIS[effectiveLevel - 1] || '1️⃣'}</span>
                      {acc.display_name}
                    </span>
                    {acc.is_admin && <span className="bg-black text-white text-[10px] px-1.5 py-0.5 rounded font-bold">Admin</span>}
                    {acc.subscription_tier === 'paid' && <span className="bg-yellow-100 text-yellow-700 text-[10px] px-1.5 py-0.5 rounded font-bold">Paid</span>}
                    {acc.is_banned && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">Banned</span>}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${statusBadge.color}`}>{statusBadge.type}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span className="truncate max-w-[150px]">{acc.email}</span>
                    <span className="text-gray-300">|</span>
                    <span>접속: {formatTimeAgo(acc.last_sign_in_at)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 font-medium mt-1.5 bg-gray-50 px-2 py-1 rounded w-fit border border-gray-100">
                    <span>📝 {acc.posts?.[0]?.count || 0}</span>
                    <span>💬 {acc.comments?.[0]?.count || 0}</span>
                    <span>💖 {acc.reactions?.[0]?.count || 0}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2 sm:mt-0 overflow-x-auto pb-1 sm:pb-0">
                <select
                  disabled={isPending || isSuperAdmin}
                  value={effectiveLevel}
                  onChange={(e) => handleLevelChange(acc.id, Number(e.target.value))}
                  className="text-xs font-medium px-2 py-1 rounded border border-gray-300 bg-white text-gray-600 outline-none"
                >
                  {[...Array(10)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{LEVEL_EMOJIS[i]} {i + 1}등급</option>
                  ))}
                </select>
                <button 
                  disabled={isPending || isSuperAdmin}
                  onClick={() => handleToggleAdmin(acc.id, acc.is_admin, acc.email)}
                  className={`whitespace-nowrap text-xs font-medium px-2 py-1 rounded border transition ${acc.is_admin ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`}
                >
                  {acc.is_admin ? t('adminRevoke') : t('adminAssign')}
                </button>
                <button 
                  disabled={isPending}
                  onClick={() => handleChangeTier(acc.id, acc.subscription_tier)}
                  className={`whitespace-nowrap text-xs font-medium px-2 py-1 rounded border transition ${acc.subscription_tier === 'paid' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`}
                >
                  {acc.subscription_tier === 'paid' ? t('paidUser') : t('freeUser')}
                </button>
                <button 
                  disabled={isPending || isSuperAdmin}
                  onClick={() => handleToggleBan(acc.id, acc.is_banned)}
                  className={`whitespace-nowrap text-xs font-medium px-2 py-1 rounded border transition ${acc.is_banned ? 'bg-red-500 text-white border-red-500 hover:bg-red-600' : 'bg-white text-red-500 border-red-200 hover:bg-red-50'}`}
                >
                  {acc.is_banned ? t('banRevoke') : t('banAccount')}
                </button>
              </div>
            </div>
          )
        })}
        {filteredAccounts.length === 0 && (
          <div className="text-center py-10 text-sm text-gray-500">{t('noUsers')}</div>
        )}
      </div>
    </div>
  )
}
