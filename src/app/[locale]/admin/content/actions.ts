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

  // Ensure the bot has the 'blogger' badge
  const { data: botAccount } = await supabaseAdmin.from('accounts').select('badges').eq('id', botId).single()
  const currentBadges = botAccount?.badges || []
  if (!currentBadges.includes('blogger')) {
    await supabaseAdmin.from('accounts').update({
      badges: [...currentBadges, 'blogger']
    }).eq('id', botId)
  }

  const { data, error } = await supabaseAdmin.from('posts').insert({
    author_id: botId,
    headline: headline,
    link_title: keyword,
    content: content,
    status: 'pending_review'
  }).select().single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}
