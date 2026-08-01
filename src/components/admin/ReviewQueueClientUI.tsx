'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { approvePost, deletePostPermanently } from '@/app/[locale]/admin/guidelines-actions'
import Link from 'next/link'

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
      {/* 1. 피드 목록 */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        {posts.map((post) => {
          const validationResults = post.validation_result as any[] || []
          const failedRules = validationResults.filter(r => !r.passed)

          return (
            <div 
              key={post.id} 
              onClick={() => setSelectedPost(post)}
              className={`bg-white p-5 rounded-xl border transition cursor-pointer ${selectedPost?.id === post.id ? 'border-black ring-2 ring-black/10' : 'border-gray-200 hover:border-gray-400'}`}
            >
              <div className="flex justify-between items-start gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <img src={post.accounts?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${post.author_id}`} className="w-6 h-6 rounded-full border" />
                  <span className="text-xs font-bold text-gray-800">{post.accounts?.display_name}</span>
                  {post.sensitivity_tag === 'sensitive' && (
                    <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">민감뉴스</span>
                  )}
                </div>
                <span className="text-[11px] text-gray-400">{new Date(post.created_at).toLocaleString()}</span>
              </div>

              <h3 className="font-bold text-gray-900 text-sm mb-2 line-clamp-1">{post.headline}</h3>
              <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed mb-3">{post.content}</p>

              {/* 검증 위반 사유 배지 */}
              <div className="flex flex-wrap gap-1.5 border-t pt-3">
                {failedRules.map((f, idx) => (
                  <span key={idx} className="text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded">
                    🚫 {f.rule_label || f.rule_key}: {f.reason}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* 2. 상세 내역 & 모더레이션 패널 */}
      <div className="lg:col-span-1">
        {selectedPost ? (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md sticky top-6 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b pb-3">
              <span className="text-xs font-bold text-red-600">REJECTED 상세 사유</span>
              <button onClick={() => setSelectedPost(null)} className="text-xs text-gray-400 hover:text-black">✕ 닫기</button>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 text-base mb-2">{selectedPost.headline}</h4>
              <div className="text-xs text-gray-600 max-h-40 overflow-y-auto whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-100 leading-relaxed mb-4">
                {selectedPost.content}
              </div>
            </div>

            <div>
              <h5 className="text-xs font-bold text-gray-700 mb-2">📋 AI 검증 상세 결과 리포트</h5>
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
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold text-xs py-2.5 rounded-lg transition"
              >
                ✓ 수동 발행 승인
              </button>
              <button
                onClick={() => handleDelete(selectedPost.id)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 rounded-lg transition"
              >
                🗑️ 영구 삭제
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 text-center text-xs text-gray-400">
            좌측 목록에서 검토할 피드를 선택하면 AI 검증 결과 리포트 및 승인/삭제 옵션이 표시됩니다.
          </div>
        )}
      </div>
    </div>
  )
}
