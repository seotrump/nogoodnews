'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import PostCard from '@/components/PostCard'
import { deleteMultiplePosts } from '@/app/feed-actions'
import { isAdmin } from '@/utils/auth'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

export default function BulkDeleteFeed({ posts, currentUser }: { posts: any[], currentUser: any }) {
  const t = useTranslations('Home')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteMode, setDeleteMode] = useState(false)
  const router = useRouter()
  
  const hasAdmin = isAdmin(currentUser)

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === posts.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(posts.map(p => p.id))
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`선택한 ${selectedIds.length}개의 게시물과 달린 댓글들을 모두 삭제하시겠습니까?`)) return

    setIsDeleting(true)
    try {
      await deleteMultiplePosts(selectedIds)
      toast.success(`${selectedIds.length}개의 게시물이 일괄 삭제되었습니다.`)
      setSelectedIds([])
      window.location.href = '/?t=' + Date.now()
    } catch (error) {
      console.error(error)
      toast.error('삭제 오류가 발생했습니다.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleDeleteMode = () => {
    setDeleteMode(prev => !prev)
    setSelectedIds([])
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
        <p className="text-gray-500 mb-4">{t('emptyFeed')}</p>
        {currentUser && (
          <Link href="/posts/new" className="text-blue-500 hover:underline font-semibold">
            {t('writeFirstPost')}
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {hasAdmin && (
        <div className="flex justify-end">
          <button
            onClick={handleToggleDeleteMode}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
              deleteMode
                ? 'bg-red-50 text-red-600 border-red-300 hover:bg-red-100'
                : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
            }`}
          >
            {deleteMode ? '삭제 모드 끄기' : '삭제 모드'}
          </button>
        </div>
      )}

      {hasAdmin && deleteMode && (
        <div className="sticky top-4 z-50 flex items-center justify-between bg-white p-4 rounded-xl shadow-md border border-gray-200">
          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              checked={selectedIds.length === posts.length && posts.length > 0}
              onChange={toggleSelectAll}
              className="w-5 h-5 cursor-pointer accent-black"
            />
            <span className="font-semibold text-gray-700 text-sm">
              {selectedIds.length > 0 ? `${selectedIds.length}개 선택됨` : '전체 선택'}
            </span>
          </div>
          {selectedIds.length > 0 && (
            <button 
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className={`bg-red-500 text-white text-sm font-bold py-2 px-4 rounded-lg hover:bg-red-600 transition ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              선택 일괄 삭제
            </button>
          )}
        </div>
      )}

      {posts.map((post) => (
        <div key={post.id} className="relative flex items-stretch gap-3">
          {hasAdmin && deleteMode && (
            <div className="pt-5 pl-2 flex items-start">
              <input 
                type="checkbox" 
                checked={selectedIds.includes(post.id)}
                onChange={() => toggleSelect(post.id)}
                className="w-5 h-5 cursor-pointer accent-black"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <PostCard post={post} currentUser={currentUser} hideDeleteButton={hasAdmin} />
          </div>
        </div>
      ))}
    </div>
  )
}
