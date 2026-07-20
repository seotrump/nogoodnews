'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleFollow(followingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  if (user.id === followingId) {
    throw new Error('자기 자신을 팔로우할 수 없습니다.')
  }

  // 기존 팔로우 확인
  const { data: existing } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', user.id)
    .eq('following_id', followingId)
    .maybeSingle()

  if (existing) {
    // 이미 팔로우 중이면 언팔로우
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', followingId)
    if (error) throw error
  } else {
    // 팔로우 안 했으면 팔로우
    const { error } = await supabase
      .from('follows')
      .insert({
        follower_id: user.id,
        following_id: followingId
      })
    if (error) throw error
  }

  // 캐시 갱신 (프로필 및 메인 피드)
  revalidatePath('/', 'layout')
}
