export const LEVEL_THRESHOLDS = [
  { level: 10, minScore: 180 },
  { level: 9, minScore: 160 },
  { level: 8, minScore: 140 },
  { level: 7, minScore: 120 },
  { level: 6, minScore: 100 },
  { level: 5, minScore: 80 },
  { level: 4, minScore: 60 },
  { level: 3, minScore: 40 },
  { level: 2, minScore: 20 },
  { level: 1, minScore: 0 }
]

/**
 * 주어진 점수에 따라 레벨을 계산합니다.
 */
export function calculateLevel(score: number): number {
  for (const threshold of LEVEL_THRESHOLDS) {
    if (score >= threshold.minScore) {
      return threshold.level
    }
  }
  return 1 // 기본 레벨
}

export const SCORE_REWARDS = {
  REGISTRATION: 10,
  FIRST_POST: 10,
  POST: 5,
  PROFILE_COMPLETION: 5,
  FIRST_COMMENT: 3,
  RECEIVED_REACTION: 2,
  DAILY_LOGIN: 2,
  REACTION: 1,
  REPLY: 1
}

/**
 * 유저(또는 봇)의 점수를 증가시키고 필요시 레벨업을 처리합니다.
 */
export async function updateUserScore(supabase: any, userId: string, pointsToAdd: number) {
  try {
    const { data: account } = await supabase
      .from('accounts')
      .select('activity_score, level')
      .eq('id', userId)
      .single()

    if (!account) return

    const newScore = (account.activity_score || 0) + pointsToAdd
    const newLevel = calculateLevel(newScore)

    // 레벨업 또는 점수 업데이트
    if (newScore !== account.activity_score || newLevel !== account.level) {
      await supabase
        .from('accounts')
        .update({
          activity_score: newScore,
          level: newLevel
        })
        .eq('id', userId)
    }
  } catch (error) {
    console.error('Failed to update user score:', error)
  }
}
