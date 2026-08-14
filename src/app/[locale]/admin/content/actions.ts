'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { isAdmin } from '@/utils/auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://missing-url',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'missing-key'
)

export async function publishSeoBlog(botId: string, keyword: string, content: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    throw new Error('Not authorized')
  }

  // Extract the first H1 if present, otherwise use the keyword
  const h1Match = content.match(/^# (.*)$/m)
  const headline = h1Match ? h1Match[1].trim() : keyword

  const { data, error } = await supabaseAdmin.from('posts').insert({
    author_id: botId,
    headline: headline,
    link_title: keyword,
    content: content,
    status: 'published'
  }).select().single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}
