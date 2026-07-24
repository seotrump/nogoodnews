'use client'

import React, { useState } from 'react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import PostCard from '@/components/PostCard'
import { deleteMultiplePosts } from '@/app/feed-actions'
import { isAdmin } from '@/utils/auth'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

export default function BulkDeleteFeed({ 
  posts, 
  currentUser, 
  sortFilter,
  headerLeftContent,
  headerBottomContent,
  feedTopContent,
  emptyFeedState,
  externalDeleteMode,
  hideInternalDeleteButton
}: { 
  posts: any[], 
  currentUser: any, 
  sortFilter?: React.ReactNode,
  headerLeftContent?: React.ReactNode,
  headerBottomContent?: React.ReactNode,
  feedTopContent?: React.ReactNode,
  emptyFeedState?: React.ReactNode,
  externalDeleteMode?: boolean,
  hideInternalDeleteButton?: boolean
}) {
  const t = useTranslations('Home')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [internalDeleteMode, setInternalDeleteMode] = useState(false)
  const router = useRouter()
  
  const deleteMode = externalDeleteMode !== undefined ? externalDeleteMode : internalDeleteMode;
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
    setInternalDeleteMode(prev => !prev)
    setSelectedIds([])
  }

  // Effect to clear selection when external delete mode turns off
  React.useEffect(() => {
    if (externalDeleteMode === false) {
      setSelectedIds([])
    }
  }, [externalDeleteMode])

  if (!posts || posts.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {(!hideInternalDeleteButton || sortFilter || headerLeftContent) && (
          <div className="mb-2 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="w-full sm:w-auto">
              <div className="flex gap-4 mb-2 border-b border-gray-200">
                {headerLeftContent}
              </div>
              {headerBottomContent && (
                <div className="min-h-[1.25rem] flex items-center">
                  {headerBottomContent}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              {hasAdmin && !hideInternalDeleteButton && (
                <button
                  onClick={handleToggleDeleteMode}
                  className={`text-xs font-semibold px-2 py-1 rounded-md border transition whitespace-nowrap ${
                    deleteMode
                      ? 'bg-red-50 text-red-600 border-red-300 hover:bg-red-100'
                      : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  {deleteMode ? '삭제 취소' : '삭제'}
                </button>
              )}
              {sortFilter && (
                <div>
                  {sortFilter}
                </div>
              )}
            </div>
          </div>
        )}
        
        {feedTopContent && (
          <div>
            {feedTopContent}
          </div>
        )}
        
        {emptyFeedState ? (
          emptyFeedState
        ) : (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500 mb-4">{t('emptyFeed')}</p>
            {currentUser && (
              <Link href="/posts/new" className="text-blue-500 hover:underline font-semibold">
                {t('writeFirstPost')}
              </Link>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {(!hideInternalDeleteButton || sortFilter || headerLeftContent) && (
        <div className="mb-2 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="w-full sm:w-auto">
            <div className="flex gap-4 mb-2 border-b border-gray-200">
              {headerLeftContent}
            </div>
            {headerBottomContent && (
              <div className="min-h-[1.25rem] flex items-center">
                {headerBottomContent}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {hasAdmin && !hideInternalDeleteButton && (
              <button
                onClick={handleToggleDeleteMode}
                className={`text-xs font-semibold px-2 py-1 rounded-md border transition whitespace-nowrap ${
                  deleteMode
                    ? 'bg-red-50 text-red-600 border-red-300 hover:bg-red-100'
                    : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                }`}
              >
                {deleteMode ? '삭제 취소' : '삭제'}
              </button>
            )}
            {sortFilter && (
              <div>
                {sortFilter}
              </div>
            )}
          </div>
        </div>
      )}
      
      {feedTopContent && (
        <div>
          {feedTopContent}
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
