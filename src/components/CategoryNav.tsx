'use client'

import { Link } from '@/i18n/routing'
import { useSearchParams } from 'next/navigation'

const CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'politics', label: '정치' },
  { id: 'economy', label: '경제' },
  { id: 'society', label: '사회' },
  { id: 'tech', label: 'IT/기술' },
  { id: 'world', label: '세계' },
  { id: 'entertainment', label: '연예' },
  { id: 'sports', label: '스포츠' },
  { id: 'culture', label: '생활/문화' },
  { id: 'opinion', label: '오피니언' },
]

export default function CategoryNav() {
  const searchParams = useSearchParams()
  const currentCategory = searchParams.get('category') || 'all'
  const currentSort = searchParams.get('sort') || 'latest'
  const currentFeed = searchParams.get('feed') || 'global'

  return (
    <nav className="w-full bg-white border border-gray-200 rounded-2xl p-2 sm:p-3 shadow-sm mb-4">
      {/* 
        - 10개 카테고리를 한 줄(10열)로 정렬
        - 모바일에서는 10개가 1줄로 들어가거나 슬림한 한줄 바 형태
      */}
      <div className="grid grid-cols-10 gap-1 sm:gap-2">
        {CATEGORIES.map((cat) => {
          const isActive = currentCategory === cat.id
          return (
            <Link
              key={cat.id}
              href={`/?feed=${currentFeed}&sort=${currentSort}&category=${cat.id}`}
              className={`flex items-center justify-center py-2 px-1 rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center whitespace-nowrap ${
                isActive
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="truncate">{cat.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
