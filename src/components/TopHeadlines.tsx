'use client'

import { useState } from 'react'
import { Link } from '@/i18n/routing'
import { Newspaper, ChevronDown, ChevronUp } from 'lucide-react'

interface TopHeadlinesProps {
  posts: any[]
  category: string
}

const CATEGORY_NAMES: Record<string, string> = {
  all: '전체',
  politics: '정치',
  economy: '경제',
  society: '사회',
  tech: 'IT/기술',
  world: '세계',
  entertainment: '연예',
  sports: '스포츠',
  culture: '생활/문화',
  opinion: '오피니언',
}

export default function TopHeadlines({ posts, category }: TopHeadlinesProps) {
  const [showAllMobile, setShowAllMobile] = useState(false)
  const topPosts = (posts || []).slice(0, 10)
  const categoryLabel = CATEGORY_NAMES[category] || '주요 이슈'

  if (topPosts.length === 0) return null

  // PC용: 5개씩 2컬럼 분할
  const pcCol1 = topPosts.slice(0, 5)
  const pcCol2 = topPosts.slice(5, 10)

  // 모바일용: 더보기 미클릭 시 5개, 클릭 시 10개
  const mobilePosts = showAllMobile ? topPosts : topPosts.slice(0, 5)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2.5 px-1 border-b border-gray-100 pb-2">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-red-500 flex-shrink-0" />
          <h2 className="font-extrabold text-xs sm:text-sm text-gray-900 flex items-center gap-1.5">
            <span>{categoryLabel} 헤드라인 TOP 10</span>
            <span className="text-[10px] font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">실시간</span>
          </h2>
        </div>
      </div>

      {/* 1. PC 화면: 5줄 x 2라인 (10개 고정) */}
      <div className="hidden md:grid md:grid-cols-2 gap-x-6 gap-y-0">
        <ul className="divide-y divide-gray-50">
          {pcCol1.map((post, idx) => (
            <li key={post.id}>
              <Link
                href={`/posts/${post.id}`}
                className="flex items-center gap-2 py-1.5 px-1 hover:bg-gray-50 rounded-lg transition-colors group"
              >
                <span className={`text-xs font-black w-4 text-center shrink-0 ${idx < 3 ? 'text-red-500' : 'text-gray-400'}`}>
                  {idx + 1}
                </span>
                <span className="text-xs font-semibold text-gray-800 group-hover:text-red-600 truncate flex-1">
                  {post.headline || post.content?.slice(0, 40) || '제목 없음'}
                </span>
                {post.comments_count > 0 && (
                  <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.2 rounded-full shrink-0">
                    +{post.comments_count}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>

        {pcCol2.length > 0 && (
          <ul className="divide-y divide-gray-50">
            {pcCol2.map((post, idx) => (
              <li key={post.id}>
                <Link
                  href={`/posts/${post.id}`}
                  className="flex items-center gap-2 py-1.5 px-1 hover:bg-gray-50 rounded-lg transition-colors group"
                >
                  <span className="text-xs font-black w-4 text-center shrink-0 text-gray-400">
                    {idx + 6}
                  </span>
                  <span className="text-xs font-semibold text-gray-800 group-hover:text-red-600 truncate flex-1">
                    {post.headline || post.content?.slice(0, 40) || '제목 없음'}
                  </span>
                  {post.comments_count > 0 && (
                    <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.2 rounded-full shrink-0">
                      +{post.comments_count}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 2. 모바일 화면: 최초 5개 노출 + '더보기' 클릭 시 10개 노출 */}
      <div className="md:hidden flex flex-col">
        <ul className="divide-y divide-gray-50">
          {mobilePosts.map((post, idx) => (
            <li key={post.id}>
              <Link
                href={`/posts/${post.id}`}
                className="flex items-center gap-2 py-1.5 px-1 hover:bg-gray-50 rounded-lg transition-colors group"
              >
                <span className={`text-xs font-black w-4 text-center shrink-0 ${idx < 3 ? 'text-red-500' : 'text-gray-400'}`}>
                  {idx + 1}
                </span>
                <span className="text-xs font-semibold text-gray-800 group-hover:text-red-600 truncate flex-1">
                  {post.headline || post.content?.slice(0, 40) || '제목 없음'}
                </span>
                {post.comments_count > 0 && (
                  <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.2 rounded-full shrink-0">
                    +{post.comments_count}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>

        {topPosts.length > 5 && (
          <button
            type="button"
            onClick={() => setShowAllMobile(!showAllMobile)}
            className="mt-2 w-full py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-xl text-xs font-bold text-gray-600 flex items-center justify-center gap-1 transition-colors"
          >
            {showAllMobile ? (
              <>
                <span>접기 (5개만 보기)</span>
                <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
              </>
            ) : (
              <>
                <span>헤드라인 더보기 (6~10위)</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
