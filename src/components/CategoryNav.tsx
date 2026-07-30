'use client'

import { useState } from 'react'
import { Link } from '@/i18n/routing'
import { useSearchParams } from 'next/navigation'
import { Menu, X } from 'lucide-react'

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

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const activeCategoryObj = CATEGORIES.find(c => c.id === currentCategory) || CATEGORIES[0]

  return (
    <nav className="w-full bg-white border border-gray-200 rounded-2xl p-2 sm:p-3 shadow-sm">
      {/* 1. PC 화면: 10개 한 줄 (10열) 노출 */}
      <div className="hidden md:grid grid-cols-10 gap-1.5">
        {CATEGORIES.map((cat) => {
          const isActive = currentCategory === cat.id
          return (
            <Link
              key={cat.id}
              href={`/?feed=${currentFeed}&sort=${currentSort}&category=${cat.id}`}
              className={`flex items-center justify-center py-2 px-1 rounded-xl text-xs font-bold transition-all text-center whitespace-nowrap ${
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

      {/* 2. 모바일 화면: 햄버거 버튼 바 + 토글 시 2행(5개씩 2줄) 노출 */}
      <div className="md:hidden flex flex-col gap-2">
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400">분야 선택:</span>
            <span className="text-xs font-extrabold text-red-500 bg-red-50 px-2.5 py-1 rounded-lg">
              {activeCategoryObj.label}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex items-center gap-1 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-colors"
          >
            {isMobileMenuOpen ? (
              <>
                <X className="w-4 h-4 text-gray-600" />
                <span>닫기</span>
              </>
            ) : (
              <>
                <Menu className="w-4 h-4 text-gray-600" />
                <span>분야 메뉴</span>
              </>
            )}
          </button>
        </div>

        {/* 햄버거 버튼 클릭 시 펼쳐지는 5열 x 2행 (총 10개 카테고리) */}
        {isMobileMenuOpen && (
          <div className="grid grid-cols-5 gap-1.5 pt-2 border-t border-gray-100 animate-in fade-in duration-200">
            {CATEGORIES.map((cat) => {
              const isActive = currentCategory === cat.id
              return (
                <Link
                  key={cat.id}
                  href={`/?feed=${currentFeed}&sort=${currentSort}&category=${cat.id}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-center py-2 px-1 rounded-xl text-[11px] font-bold transition-all text-center whitespace-nowrap ${
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
        )}
      </div>
    </nav>
  )
}
