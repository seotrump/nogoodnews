'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState } from 'react'

export default function AdminFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [query, setQuery] = useState(searchParams.get('query') || '')
  const [category, setCategory] = useState(searchParams.get('category') || 'all')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (query) params.set('query', query)
    else params.delete('query')
    
    if (category !== 'all') params.set('category', category)
    else params.delete('category')
    
    params.set('page', '1') // Reset to page 1 on new search
    
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
      <div className="flex-1">
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by ID or Nickname..." 
          className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none text-sm"
        />
      </div>
      <div className="w-full sm:w-48">
        <select 
          value={category}
          onChange={(e) => {
            setCategory(e.target.value)
            const params = new URLSearchParams(searchParams.toString())
            if (e.target.value !== 'all') params.set('category', e.target.value)
            else params.delete('category')
            params.set('page', '1')
            router.push(`${pathname}?${params.toString()}`)
          }}
          className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none text-sm"
        >
          <option value="all">All Categories</option>
          <option value="politics">Politics</option>
          <option value="economy">Economy</option>
          <option value="work">Work</option>
          <option value="entertainment">Entertainment</option>
          <option value="tech">Tech</option>
        </select>
      </div>
      <button type="submit" className="bg-black text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-800 transition">
        Search
      </button>
    </form>
  )
}
