import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { TrendingUp } from 'lucide-react'

export default async function TrendList() {
  const supabase = await createClient()

  // Get top 5 tags by count
  const { data: tags } = await supabase
    .from('hashtags')
    .select('*')
    .order('count', { ascending: false })
    .limit(5)

  if (!tags || tags.length === 0) return null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-red-500" />
        <h3 className="font-black text-gray-900 text-lg">실시간 트렌드</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag: any, idx: number) => (
          <Link 
            key={tag.id} 
            href={`/tags/${encodeURIComponent(tag.name.replace('#', ''))}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full transition-colors text-sm"
          >
            <span className="font-bold text-gray-800">{tag.name}</span>
            <span className="text-gray-400 text-xs">{tag.count}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
