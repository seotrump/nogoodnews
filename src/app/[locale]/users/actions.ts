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

    // AI 봇 여부 확인 및 70% 확률로 맞팔로우 (Phase 4 봇 능동성)
    const { data: targetAccount } = await supabase
      .from('accounts')
      .select('is_ai, gender')
      .eq('id', followingId)
      .single()
      
    const { data: userAccount } = await supabase
      .from('accounts')
      .select('gender')
      .eq('id', user.id)
      .single()

    if (targetAccount?.is_ai && Math.random() < 0.7) {
      // 성별 조건 검사: 서로 이성일 때만 가능 (중성 불가)
      const bg = targetAccount.gender
      const ug = userAccount?.gender
      const isValid = bg !== 'neutral' && ((bg === 'male' && ug === 'female') || (bg === 'female' && ug === 'male'))
      
      if (isValid) {
        await supabase.from('follows').insert({
          follower_id: followingId,
          following_id: user.id
        })
      }
    }
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
    .select('id, username, display_name, avatar_url, bio, is_ai, level, followers_count')
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

export async function completeOnboarding(categories: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다.')

  const { data: userAcc } = await supabase.from('accounts').select('gender').eq('id', user.id).single()
  const userGender = userAcc?.gender

  // 1. 선택한 카테고리의 인기 봇 찾기 (카테고리당 2~3개씩 최대 10개)
  let recommendedBotsList: any[] = []
  let recommendedBotIds: string[] = []
  if (categories.length > 0) {
    const { data: bots } = await supabase
      .from('accounts')
      .select('id, category, gender')
      .eq('is_ai', true)
      .in('category', categories)
      .order('followers_count', { ascending: false })
      .limit(20)

    if (bots) {
      // 섞기
      for (let i = bots.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bots[i], bots[j]] = [bots[j], bots[i]];
      }
      recommendedBotsList = bots.slice(0, 10)
      recommendedBotIds = recommendedBotsList.map(b => b.id)
    }
  } else {
    // 카테고리 미선택 시 글로벌 인기 봇
    const { data: topBots } = await supabase
      .from('accounts')
      .select('id, gender')
      .eq('is_ai', true)
      .order('followers_count', { ascending: false })
      .limit(5)
    if (topBots) {
      recommendedBotsList = topBots
      recommendedBotIds = topBots.map(b => b.id)
    }
  }

  // 2. 다중 팔로우 처리
  if (recommendedBotIds.length > 0) {
    // 이미 팔로우한 것 제외
    const { data: existing } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .in('following_id', recommendedBotIds)
      
    const existingIds = existing?.map(e => e.following_id) || []
    const toInsert = recommendedBotIds
      .filter(id => !existingIds.includes(id))
      .map(id => ({ follower_id: user.id, following_id: id }))
      
    if (toInsert.length > 0) {
      await supabase.from('follows').insert(toInsert)
    }

    // Phase 4: 뉴비 환영 선팔 (1~2마리의 봇이 가입을 환영하며 유저를 선팔)
    // 조건: 이성 봇만 선팔 가능
    const eligibleBotsToFollowUser = recommendedBotsList.filter(b => {
      const bg = b.gender
      return bg !== 'neutral' && ((bg === 'male' && userGender === 'female') || (bg === 'female' && userGender === 'male'))
    })
    
    const botsToFollowUser = eligibleBotsToFollowUser.slice(0, 2).map(b => ({ follower_id: b.id, following_id: user.id }))
    if (botsToFollowUser.length > 0) {
      await supabase.from('follows').insert(botsToFollowUser)
    }
  }

  // 3. 온보딩 완료 처리
  await supabase.from('accounts').update({ is_onboarded: true }).eq('id', user.id)
  
  revalidatePath('/', 'layout')
}

export async function skipOnboarding() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다.')
  
  await supabase.from('accounts').update({ is_onboarded: true }).eq('id', user.id)
  revalidatePath('/', 'layout')
}
