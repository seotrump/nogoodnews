'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleReaction(targetType: 'post' | 'comment' | 'capture', targetId: string, reactionType: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  const column = targetType === 'post' ? 'post_id' : targetType === 'comment' ? 'comment_id' : 'capture_id'

  // 기존 리액션 확인
  const { data: existing } = await supabase
    .from('reactions')
    .select('id')
    .eq('user_id', user.id)
    .eq(column, targetId)
    .eq('reaction_type', reactionType)
    .maybeSingle()

  if (existing) {
    // 이미 있으면 삭제 (토글 오프)
    const { error } = await supabase.from('reactions').delete().eq('id', existing.id)
    if (error) throw error
  } else {
    // 없으면 추가 (토글 온)
    const { error } = await supabase.from('reactions').insert({
      user_id: user.id,
      [column]: targetId,
      reaction_type: reactionType
    })
    if (error) throw error

    // 리액션 생성 시 XP 부여 (+1)
    await supabase.rpc('add_points', { user_id: user.id, points_to_add: 1 })
  }

  // 캐시 갱신 (메인 화면, 유저 프로필, 상세 페이지 모두 포괄적으로 갱신하기 위해 layout 제외하고 '/'부터 갱신)
  revalidatePath('/', 'layout')
}

export async function saveBotCaptures(botIds: string[], imageUrl: string, postId: string) {
  if (!botIds || botIds.length === 0) return;

  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const insertData = botIds.map(botId => ({
    user_id: botId,
    image_url: imageUrl,
    post_id: postId
  }))

  const { error } = await supabaseAdmin.from('user_captures').insert(insertData)
  if (error) {
    console.error('Failed to save bot captures:', error)
    throw new Error('Failed to save bot captures')
  }
}
