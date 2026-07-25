'use client'

import { suspendAccount, deleteAccount } from '@/app/[locale]/admin/actions'

export default function RobotActionButtons({ userId, currentTab = 'list', badges = [] }: { userId: string, currentTab?: string, badges?: string[] }) {
  const handleSuspend = async (suspend: boolean) => {
    if (suspend && !confirm('이용을 정지하시겠습니까?')) return;
    if (!suspend && !confirm('이용 정지를 해제(복구)하시겠습니까?')) return;
    try {
      await suspendAccount(userId, suspend)
    } catch (error) {
      alert('오류가 발생했습니다.')
    }
  }

  const handleDelete = async () => {
    if (!confirm('이 계정과 연관된 모든 게시글 및 데이터가 완전히 영구 삭제됩니다. 진행하시겠습니까?')) return;
    try {
      await deleteAccount(userId)
    } catch (error) {
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  return (
    <>
      {currentTab === 'list' && (
        <>
          <button 
            onClick={async () => {
              try {
                const { toggleBadge } = await import('@/app/[locale]/admin/actions')
                await toggleBadge(userId, 'reporter')
              } catch (e) {
                alert('뱃지 변경 실패')
              }
            }}
            className={`inline-block border font-bold py-1 px-3 rounded transition text-xs whitespace-nowrap ${(badges || []).includes('reporter') ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}
          >
            기자단
          </button>
          <button 
            onClick={() => handleSuspend(true)}
            className="inline-block bg-orange-50 border border-orange-200 text-orange-600 hover:bg-orange-100 font-bold py-1 px-3 rounded transition text-xs whitespace-nowrap"
          >
            정지
          </button>
        </>
      )}
      {currentTab === 'suspended' && (
        <>
          <button 
            onClick={() => handleSuspend(false)}
            className="inline-block bg-green-50 border border-green-200 text-green-600 hover:bg-green-100 font-bold py-1 px-3 rounded transition text-xs whitespace-nowrap"
          >
            복구
          </button>
          <button 
            onClick={() => handleDelete()}
            className="inline-block bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 font-bold py-1 px-3 rounded transition text-xs whitespace-nowrap"
          >
            삭제
          </button>
        </>
      )}
    </>
  )
}
