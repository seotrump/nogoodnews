import { Link } from '@/i18n/routing'
import { Newspaper } from 'lucide-react'

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
  // 최신 10개 게시물 헤드라인
  const topPosts = (posts || []).slice(0, 10)
  const categoryLabel = CATEGORY_NAMES[category] || '주요 이슈'

  if (topPosts.length === 0) return null

  // 10개 기사를 5개씩 2줄(2개 컬럼)로 나누기
  const col1 = topPosts.slice(0, 5)
  const col2 = topPosts.slice(5, 10)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-4">
      <div className="flex items-center gap-2 mb-3 px-1 border-b border-gray-100 pb-2.5">
        <Newspaper className="w-4 h-4 text-red-500 flex-shrink-0" />
        <h2 className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
          <span>{categoryLabel} 헤드라인 TOP 10</span>
          <span className="text-[10px] font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">실시간</span>
        </h2>
      </div>

      {/* PC: 2컬럼 (좌측 5개 / 우측 5개), 모바일: 10개 세로 배치 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0 divide-y md:divide-y-0 divide-gray-100">
        {/* 컬럼 1 (1~5위) */}
        <ul className="divide-y divide-gray-50">
          {col1.map((post, idx) => (
            <li key={post.id}>
              <Link
                href={`/posts/${post.id}`}
                className="flex items-center gap-2 py-2 px-1 hover:bg-gray-50 rounded-lg transition-colors group"
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

        {/* 컬럼 2 (6~10위) */}
        {col2.length > 0 && (
          <ul className="divide-y divide-gray-50 pt-1 md:pt-0">
            {col2.map((post, idx) => (
              <li key={post.id}>
                <Link
                  href={`/posts/${post.id}`}
                  className="flex items-center gap-2 py-2 px-1 hover:bg-gray-50 rounded-lg transition-colors group"
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
    </div>
  )
}
