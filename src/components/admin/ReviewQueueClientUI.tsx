'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { approvePost, deletePostPermanently } from '@/app/[locale]/admin/guidelines-actions'
import PostCard from '@/components/PostCard'

export default function ReviewQueueClientUI({ posts: initialPosts }: { posts: any[] }) {
  const [posts, setPosts] = useState(initialPosts)
  const [selectedPost, setSelectedPost] = useState<any | null>(null)

  const handleApprove = async (postId: string) => {
    try {
      await approvePost(postId)
      setPosts(posts.filter(p => p.id !== postId))
      if (selectedPost?.id === postId) setSelectedPost(null)
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
      if (selectedPost?.id === postId) setSelectedPost(null)
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. 피드 목록 (메인 전체 피드와 동일한 PostCard 및 수정 레이아웃 활용) */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        {posts.map((post) => {
          const validationResults = (post.validation_result as any[]) || []
          const failedRules = validationResults.filter(r => !r.passed)

          return (
            <div 
              key={post.id} 
              onClick={() => setSelectedPost(post)}
              className={`bg-white rounded-xl border transition cursor-pointer overflow-hidden shadow-sm ${selectedPost?.id === post.id ? 'border-black ring-2 ring-black/10' : 'border-gray-200 hover:border-gray-300'}`}
            >
              {/* 메인 전체 피드 및 수정 화면과 완전히 동일한 Card 컴포넌트 재사용 */}
              <PostCard post={post} currentUser={{ id: 'admin' }} hideDeleteButton={true} />

              {/* 검토대기 툴바 및 위반 사유 표시 */}
              <div className="bg-gray-50 border-t border-gray-100 p-4 flex flex-col gap-3">
                {failedRules.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-xs font-bold text-red-600">🚨 위반 항목:</span>
                    {failedRules.map((f, idx) => (
                      <span key={idx} className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200">
                        {f.rule_label || f.rule_key}: {f.reason}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleApprove(post.id)
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition shadow-sm"
                  >
                    ✓ 수동 발행 승인
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(post.id)
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition shadow-sm"
                  >
                    🗑️ 영구 삭제
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 2. 상세 검증 리포트 패널 */}
      <div className="lg:col-span-1">
        {selectedPost ? (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md sticky top-20 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b pb-3">
              <span className="text-xs font-bold text-red-600">AI 검증 리포트 상세</span>
              <button onClick={() => setSelectedPost(null)} className="text-xs text-gray-400 hover:text-black">✕ 닫기</button>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 text-sm mb-1">{selectedPost.headline}</h4>
              <p className="text-xs text-gray-500 line-clamp-3">{selectedPost.content}</p>
            </div>

            <div>
              <h5 className="text-xs font-bold text-gray-700 mb-2">📋 규정 준수 검사 항목</h5>
              <div className="flex flex-col gap-2">
                {(selectedPost.validation_result || []).map((res: any, idx: number) => (
                  <div key={idx} className={`p-2.5 rounded text-xs border ${res.passed ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    <div className="font-bold flex items-center justify-between">
                      <span>{res.rule_label || res.rule_key}</span>
                      <span>{res.passed ? '✅ 통과' : '❌ 위반'}</span>
                    </div>
                    <p className="mt-1 text-[11px] opacity-90">{res.reason}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t mt-2">
              <button
                onClick={() => handleApprove(selectedPost.id)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-lg transition"
              >
                ✓ 승인
              </button>
              <button
                onClick={() => handleDelete(selectedPost.id)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 rounded-lg transition"
              >
                🗑️ 삭제
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 text-center text-xs text-gray-400">
            좌측 목록에서 검토할 피드를 클릭하시면 AI 규정 검사 리포트 및 세부 통과 내역을 확인하실 수 있습니다.
          </div>
        )}
      </div>
    </div>
  )
}
