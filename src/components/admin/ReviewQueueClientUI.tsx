'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { approvePost, bulkApprovePosts, deletePostPermanently, runAutoApproveCronNow } from '@/app/[locale]/admin/guidelines-actions'
import PostCard from '@/components/PostCard'

export default function ReviewQueueClientUI({ posts: initialPosts }: { posts: any[] }) {
  const [posts, setPosts] = useState(initialPosts)
  const [activeTab, setActiveTab] = useState<'pending' | 'published' | 'rejected' | 'all'>('pending')
  const [isRunningCron, setIsRunningCron] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const handleRunCronNow = async () => {
    setIsRunningCron(true)
    const toastId = toast.loading('⚡ 15분 경과 대기 피드 크론 일괄 승인 진행 중...')
    try {
      const res = await runAutoApproveCronNow()
      if (res.count && res.count > 0) {
        setPosts(posts.map(p => {
          const createdMs = new Date(p.created_at).getTime()
          const isDue = (Date.now() - createdMs) >= (5 * 60 * 1000) // 백엔드와 동일하게 5분으로 통일
          if (p.status === 'pending_review' && isDue) {
            return { ...p, status: 'published' }
          }
          return p
        }))
        toast.success(res.message, { id: toastId })
      } else {
        toast.success(res.message || '15분 이상 경과된 대기 피드가 없습니다.', { id: toastId })
      }
    } catch (e: any) {
      toast.error(e.message || '크론 실행 실패', { id: toastId })
    } finally {
      setIsRunningCron(false)
    }
  }

  const handleApprove = async (postId: string) => {
    try {
      await approvePost(postId)
      setPosts(posts.map(p => p.id === postId ? { ...p, status: 'published' } : p))
      toast.success('게시물이 성공적으로 수동 발행 승인되었습니다.')
    } catch (e: any) {
      toast.error(e.message || '승인 실패')
    }
  }

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`선택한 ${selectedIds.length}개 피드를 예약 발행하시겠습니까?`)) return
    
    setIsProcessing(true)
    const toastId = toast.loading(`피드 ${selectedIds.length}개 예약 발행 중...`)
    
    try {
      await bulkApprovePosts(selectedIds)
      
      // 상태 낙관적 업데이트 (ui에서는 published로 간주)
      setPosts(posts.map(p => selectedIds.includes(p.id) ? { ...p, status: 'published' } : p))
      setSelectedIds([])
      toast.success('선택 피드가 예약 발행 대기열에 등록되었습니다.', { id: toastId })
    } catch (e: any) {
      toast.error(e.message || '일괄 승인 실패', { id: toastId })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`선택한 ${selectedIds.length}개 피드를 영구 삭제하시겠습니까?`)) return

    setIsProcessing(true)
    const toastId = toast.loading(`피드 ${selectedIds.length}개 삭제 중...`)

    try {
      for (const id of selectedIds) {
        await deletePostPermanently(id)
      }
      setPosts(posts.filter(p => !selectedIds.includes(p.id)))
      setSelectedIds([])
      toast.success('선택한 피드가 영구 삭제되었습니다.', { id: toastId })
    } catch (e: any) {
      toast.error(e.message || '일괄 삭제 실패', { id: toastId })
    } finally {
      setIsProcessing(false)
    }
  }

  const toggleSelection = (postId: string) => {
    setSelectedIds(prev => 
      prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]
    )
  }

  const toggleAllSelection = () => {
    const pendingIds = filteredPosts.filter(p => p.status === 'pending_review').map(p => p.id)
    if (selectedIds.length === pendingIds.length && pendingIds.length > 0) {
      setSelectedIds([]) // 전부 해제
    } else {
      setSelectedIds(pendingIds) // 전부 선택
    }
  }

  const handleDelete = async (postId: string) => {
    if (!confirm('정말 이 게시물을 영구 삭제하시겠습니까?')) return
    try {
      await deletePostPermanently(postId)
      setPosts(posts.filter(p => p.id !== postId))
      toast.success('게시물이 영구 삭제되었습니다.')
    } catch (e: any) {
      toast.error(e.message || '삭제 실패')
    }
  }

  const filteredPosts = posts.filter(p => {
    if (activeTab === 'pending') return p.status === 'pending_review'
    if (activeTab === 'published') return p.status === 'published'
    if (activeTab === 'rejected') return p.status === 'rejected'
    return true
  })

  // 생성 시간 기준 5분 경과 여부 및 남은 시간 계산 함수
  const getMinutesRemaining = (createdAtStr: string) => {
    const createdMs = new Date(createdAtStr).getTime()
    const diffMs = Date.now() - createdMs
    const remainingMs = (5 * 60 * 1000) - diffMs
    if (remainingMs <= 0) return '발행 대기'
    const remainingMinutes = Math.ceil(remainingMs / (60 * 1000))
    return `발행 대기 (-${remainingMinutes}분)`
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 상태 필터 탭 */}
      <div className="flex items-center gap-1.5 border-b border-gray-200 pb-3 flex-wrap">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'pending'
              ? 'bg-gray-700 text-white shadow-xs'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span>⏳ 대기</span>
          <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">
            {posts.filter(p => p.status === 'pending_review').length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('published')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'published'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span>✅ 승인</span>
          <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">
            {posts.filter(p => p.status === 'published').length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('rejected')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'rejected'
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span>🚨 차단됨</span>
          <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">
            {posts.filter(p => p.status === 'rejected').length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            activeTab === 'all'
              ? 'bg-gray-900 text-white shadow-xs'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          전체 ({posts.length})
        </button>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRunCronNow}
            disabled={isRunningCron}
            className={`font-extrabold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1 shadow-xs ${
              isRunningCron
                ? 'bg-purple-300 text-white cursor-not-allowed animate-pulse'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            <span>{isRunningCron ? '크론실행중...' : '크론실행'}</span>
          </button>
        </div>
      </div>

      {activeTab === 'pending' && filteredPosts.length > 0 && (
        <div className="flex items-center gap-3 border-b border-gray-200 pb-3 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition shadow-xs">
            <input 
              type="checkbox" 
              checked={selectedIds.length > 0 && selectedIds.length === filteredPosts.filter(p => p.status === 'pending_review').length}
              onChange={toggleAllSelection}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs font-bold text-gray-700">전체 선택 ({selectedIds.length}/{filteredPosts.filter(p => p.status === 'pending_review').length})</span>
          </label>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleBulkApprove}
                disabled={isProcessing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition shadow-xs flex items-center gap-1 animate-in fade-in"
              >
                <span>✅</span>
                <span>선택 {selectedIds.length}개 일괄 승인</span>
              </button>

              <button
                onClick={handleBulkDelete}
                disabled={isProcessing}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition shadow-xs flex items-center gap-1 animate-in fade-in"
              >
                <span>🗑️</span>
                <span>선택 {selectedIds.length}개 삭제</span>
              </button>
            </div>
          )}
        </div>
      )}

      {filteredPosts.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
          <p className="text-gray-500 font-medium">해당 상태의 피드가 없습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5 w-full">
          {filteredPosts.map((post) => {
            const validationResults = (post.validation_result as any[]) || []
            const failedRules = validationResults.filter(r => !r.passed)
            const isPublished = post.status === 'published'
            const isRejected = post.status === 'rejected' || failedRules.length > 0
            const isPending = post.status === 'pending_review'

            return (
              <div 
                key={post.id} 
                className={`bg-white rounded-xl border overflow-hidden shadow-xs flex flex-col transition ${
                  isRejected 
                    ? 'border-red-300 ring-1 ring-red-200' 
                    : isPublished 
                    ? 'border-emerald-300 ring-1 ring-emerald-100' 
                    : selectedIds.includes(post.id)
                    ? 'border-indigo-400 ring-2 ring-indigo-200 bg-indigo-50/20'
                    : 'border-gray-300 ring-1 ring-gray-100'
                }`}
              >
                {/* 진단 결과 카드 영역 */}
                <div className="bg-gray-50 border-b border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  
                  {/* 자가검열 상태 및 위반 사유 안내 */}
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-gray-700">시스템 모더레이션:</span>

                      {isPublished ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-full shadow-xs">
                          ✅ 발행 승인 (Published)
                        </span>
                      ) : isRejected ? (
                        <span className="inline-flex items-center gap-1 bg-red-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-full shadow-xs">
                          ⚠️ 위반 탐지 (발행 차단)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-gray-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-full shadow-xs">
                          ⏳ {getMinutesRemaining(post.created_at)}
                        </span>
                      )}

                      <div className="flex items-center gap-2 ml-1">
                        {!isPublished && (
                          <button
                            onClick={() => handleApprove(post.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-2.5 py-1 rounded-full transition shadow-xs flex items-center gap-1"
                          >
                            <span>즉시발행</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs px-2.5 py-1 rounded-full transition shadow-xs flex items-center gap-1"
                        >
                          <span>영구삭제</span>
                        </button>
                      </div>
                    </div>

                    {/* 자가검열 위반 항목 상세 사유 목록 */}
                    {failedRules.length > 0 && (
                      <div className="mt-2 bg-red-50 border border-red-200 p-3 rounded-lg flex flex-col gap-1.5">
                        <p className="text-xs font-bold text-red-800 flex items-center gap-1">
                          <span>🚨 위반 항목 {failedRules.length}건이 발견되어 자동발행이 중단되었습니다:</span>
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {failedRules.map((f: any, idx: number) => (
                            <div
                              key={idx}
                              className="bg-white border border-red-300 text-red-700 text-xs font-bold px-2.5 py-1 rounded-md shadow-xs flex items-center gap-1.5"
                            >
                              <span className="text-red-600 font-black">✕</span>
                              <span>[{f.rule_label || f.rule_key}]</span>
                              <span className="text-[11px] text-gray-600 font-normal">({f.reason})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {isPending && (
                      <div className="mt-1 flex items-center justify-between w-full">
                        {failedRules.length === 0 ? (
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                            <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded">가이드라인 검증 통과</span>
                            <span className="text-gray-400">|</span>
                            <span>자동 발행 스케줄러 대기 중</span>
                          </div>
                        ) : (
                          <div /> // 빈 공간 차지용
                        )}
                        <div className="flex items-center gap-2 ml-auto">
                          <label className="text-xs font-bold text-gray-600 cursor-pointer flex items-center gap-1.5 hover:text-indigo-600 transition">
                            선택
                            <input 
                              type="checkbox" 
                              checked={selectedIds.includes(post.id)}
                              onChange={() => toggleSelection(post.id)}
                              className="w-5 h-5 rounded border-gray-300 text-indigo-600 cursor-pointer focus:ring-indigo-500"
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 메인 피드 Card 컴포넌트 */}
                <div className="relative">
                  <PostCard post={post} currentUser={{ id: 'admin' }} hideDeleteButton={true} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
