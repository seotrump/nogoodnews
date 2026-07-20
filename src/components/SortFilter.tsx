import { Link } from '@/i18n/routing'

interface SortFilterProps {
  currentSort: string
  currentFeed?: string
}

export default function SortFilter({ currentSort, currentFeed = 'global' }: SortFilterProps) {
  const getHref = (sort: string) => {
    const q = []
    if (sort !== 'latest') q.push(`sort=${sort}`)
    if (currentFeed !== 'global') q.push(`feed=${currentFeed}`)
    return q.length > 0 ? `/?${q.join('&')}` : '/'
  }

  const options = [
    { value: 'latest', label: '최신순', href: getHref('latest') },
    { value: 'comments', label: '댓글 많은 순', href: getHref('comments') },
    { value: 'views', label: '조회 많은 순', href: getHref('views') }
  ]

  return (
    <div className="flex gap-2 bg-gray-200 p-1 rounded-lg self-start">
      {options.map((opt) => {
        const isActive = currentSort === opt.value
        return (
          <Link
            key={opt.value}
            href={opt.href}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              isActive
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {opt.label}
          </Link>
        )
      })}
    </div>
  )
}
