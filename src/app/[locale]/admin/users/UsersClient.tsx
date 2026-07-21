'use client'

import { useState } from 'react'
import { toggleUserBan, toggleUserAdmin, changeUserTier } from './actions'
import { toast } from 'react-hot-toast'
import { ADMIN_EMAIL } from '@/utils/auth'
import { useTranslations } from 'next-intl'

export default function UsersClient({ accounts, currentUserEmail }: { accounts: any[], currentUserEmail?: string }) {
  const t = useTranslations('Admin')
  const [search, setSearch] = useState('')
  const [isPending, setIsPending] = useState(false)

  const filteredAccounts = accounts.filter(acc => 
    (acc.display_name?.toLowerCase().includes(search.toLowerCase()) || '') ||
    (acc.username?.toLowerCase().includes(search.toLowerCase()) || '') ||
    (acc.email?.toLowerCase().includes(search.toLowerCase()) || '')
  )

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <input 
          type="text" 
          placeholder={t('searchUsersPlaceholder')} 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full sm:w-1/2 border border-gray-200 p-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-black"
        />
        <span className="text-sm text-gray-500 font-medium whitespace-nowrap">{t('totalUsers', { count: filteredAccounts.length })}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        {filteredAccounts.map(acc => {
          const isSuperAdmin = acc.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
          return (
            <div key={acc.id} className="border-b border-gray-100 py-1.5 flex flex-col sm:flex-row gap-2 sm:items-center justify-between bg-white hover:bg-gray-50 transition">
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-gray-900 text-sm">{acc.display_name}</span>
                    {acc.is_admin && <span className="bg-black text-white text-[10px] px-1.5 py-0.5 rounded font-bold">Admin</span>}
                    {acc.subscription_tier === 'paid' && <span className="bg-yellow-100 text-yellow-700 text-[10px] px-1.5 py-0.5 rounded font-bold">Paid</span>}
                    {acc.is_banned && <span className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded font-bold">Banned</span>}
                  </div>
                  <span className="text-xs text-gray-500">{acc.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2 sm:mt-0 overflow-x-auto pb-1 sm:pb-0">
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
