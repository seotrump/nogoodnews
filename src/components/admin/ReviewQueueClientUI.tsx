'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { approvePost, deletePostPermanently } from '@/app/[locale]/admin/guidelines-actions'
import PostCard from '@/components/PostCard'

export default function ReviewQueueClientUI({ posts: initialPosts }: { posts: any[] }) {
  const [posts, setPosts] = useState(initialPosts)

  const handleApprove = async (postId: string) => {
    try {
      await approvePost(postId)
      setPosts(posts.filter(p => p.id !== postId))
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

  if (!posts || posts.length === 0) {
    return (
      <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
        <p className="text-gray-500 font-medium">🎉 차단되거나 검토 대기 중인 안전 위배 게시글이 없습니다!</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 검토 대기 피드 단일 열 메인 피드 스타일 목록 */}
      <div className="flex flex-col gap-5 w-full">
        {posts.map((post) => {
          const validationResults = (post.validation_result as any[]) || []
          const failedRules = validationResults.filter(r => !r.passed)

          return (
            <div 
              key={post.id} 
              className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col"
            >
              {/* 메인 피드와 완전히 동일한 Card 컴포넌트 재사용 */}
              <PostCard post={post} currentUser={{ id: 'admin' }} hideDeleteButton={true} />

              {/* 피드 아래쪽에 문제가 된 검토 항목 체크 버튼 및 관리 버튼 배치 */}
              <div className="bg-gray-50 border-t border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                
                {/* 걸린 검토 항목 체크 버튼 표기 (클릭 시 사유 툴팁/안내) */}
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-bold text-red-600 shrink-0">🚨 위반 검토 항목:</span>
                  {failedRules.length > 0 ? (
                    failedRules.map((f, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toast((t) => (
                          <div className="text-xs font-semibold">
                            <span className="font-bold text-red-600">[{f.rule_label || f.rule_key}]</span>: {f.reason}
                          </div>
                        ), { icon: '⚠️', duration: 4000 })}
                        className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-extrabold px-3 py-1.5 rounded-lg shadow-sm transition cursor-pointer"
                        title={f.reason}
                      >
                        <span className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-black">✓</span>
                        <span>{f.rule_label || f.rule_key}</span>
                      </button>
                    ))
                  ) : (
                    <span className="text-xs text-gray-500 font-semibold bg-gray-200 px-2.5 py-1 rounded-md">
                      ⚠️ 대기 상태 (수동 검토 필요)
                    </span>
                  )}
                </div>

                {/* 수동 발행 승인 및 영구 삭제 버튼 */}
                <div className="flex items-center gap-2 justify-end shrink-0">
                  <button
                    onClick={() => handleApprove(post.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition shadow-sm flex items-center gap-1"
                  >
                    <span>✓</span>
                    <span>수동 발행 승인</span>
                  </button>
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition shadow-sm flex items-center gap-1"
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
    </div>
  )
}
