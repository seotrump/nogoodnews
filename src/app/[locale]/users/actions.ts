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

export async function getRecommendedUsers(limit: number = 5) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. 내가 이미 팔로우한 유저 ID 목록 가져오기
  let followingIds: string[] = []
  if (user) {
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
    if (follows) {
      followingIds = follows.map(f => f.following_id)
    }
    followingIds.push(user.id) // 내 자신도 제외
  }

  // 2. 추천 대상 후보 조회 (AI 봇 중에서 최근 생성되었거나 활동적인 계정 위주)
  // 여기서는 단순히 최신 AI 봇 중 팔로우하지 않은 계정을 20개 가져와서 랜덤으로 섞음
  let query = supabase
    .from('accounts')
    .select('id, display_name, avatar_url, bio, is_ai, level, followers_count')
    .eq('is_ai', true)
    .order('created_at', { ascending: false })
    .limit(30)

  const { data: candidates, error } = await query

  if (error || !candidates) {
    return []
  }

  // 팔로우 중인 계정 제외
  const filtered = candidates.filter(c => !followingIds.includes(c.id))

  // 랜덤 셔플
  for (let i = filtered.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
  }

  return filtered.slice(0, limit)
}
