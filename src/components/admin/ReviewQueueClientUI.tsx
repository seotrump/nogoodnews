'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { approvePost, deletePostPermanently } from '@/app/[locale]/admin/guidelines-actions'
import PostCard from '@/components/PostCard'

export default function ReviewQueueClientUI({ posts: initialPosts }: { posts: any[] }) {
  const [posts, setPosts] = useState(initialPosts)
  const [activeTab, setActiveTab] = useState<'pending' | 'published' | 'rejected' | 'all'>('pending')

  const handleApprove = async (postId: string) => {
    try {
      await approvePost(postId)
      setPosts(posts.map(p => p.id === postId ? { ...p, status: 'published' } : p))
      toast.success('게시물이 성공적으로 수동 발행 승인되었습니다.')
    } catch (e: any) {
      toast.error(e.message || '승인 실패')
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

  // 생성 시간 기준 15분 경과 여부 및 남은 시간 계산 함수
  const getMinutesRemaining = (createdAtStr: string) => {
    const createdMs = new Date(createdAtStr).getTime()
    const diffMs = Date.now() - createdMs
    const remainingMs = (15 * 60 * 1000) - diffMs
    if (remainingMs <= 0) return '곧 자동 발행 예정 (15분 크론 실행 대기중)'
    const remainingMinutes = Math.ceil(remainingMs / (60 * 1000))
    return `약 ${remainingMinutes}분 후 자동 발행 예정`
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 상태 필터 탭 */}
      <div className="flex items-center gap-1.5 border-b border-gray-200 pb-3 flex-wrap">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'pending'
              ? 'bg-yellow-500 text-white shadow-xs'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span>⏳ 대기중 (15분 스케줄)</span>
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
          <span>✅ 자동승인 완료</span>
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
          <span>🚨 위반 차단됨</span>
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
      </div>

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
                    : 'border-yellow-300 ring-1 ring-yellow-100'
                }`}
              >
                {/* 메인 피드 Card 컴포넌트 */}
                <PostCard post={post} currentUser={{ id: 'admin' }} hideDeleteButton={true} />

                {/* 진단 결과 카드 영역 */}
                <div className="bg-gray-50 border-t border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  
                  {/* 자가검열 상태 및 위반 사유 안내 */}
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-gray-700">🛡️ 2중 자가검열 체계:</span>

                      {isPublished ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-full shadow-xs">
                          ✅ 발행 승인 완료 (Published)
                        </span>
                      ) : isRejected ? (
                        <span className="inline-flex items-center gap-1 bg-red-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-full shadow-xs">
                          ⚠️ 자가검열 위반 탐지 (자동발행 중단됨)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-yellow-500 text-white font-extrabold text-xs px-2.5 py-1 rounded-full shadow-xs">
                          ⏳ {getMinutesRemaining(post.created_at)}
                        </span>
                      )}
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

                    {isPending && failedRules.length === 0 && (
                      <p className="text-xs text-emerald-700 font-bold mt-1">
                        ✨ 콘텐츠 가이드라인 100% 통과 — 15분 경과 후 크론 스케줄러에 의해 자동으로 발행됩니다.
                      </p>
                    )}
                  </div>

                  {/* 수동 발행 승인 및 영구 삭제 버튼 */}
                  <div className="flex items-center gap-2 justify-end shrink-0 self-end sm:self-center">
                    {!isPublished && (
                      <button
                        onClick={() => handleApprove(post.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1"
                      >
                        <span>✓</span>
                        <span>수동 즉시 발행</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1"
                    >
                      <span>🗑️</span>
                      <span>영구 삭제</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
