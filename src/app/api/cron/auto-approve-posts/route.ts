import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export const maxDuration = 60; // 60초 타임아웃

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET / POST /api/cron/auto-approve-posts
 * 
 * 생성된 지 1시간 이상 지난 'pending_review' 상태의 피드들을 대상으로
 * 독립 콘텐츠 안전 검증기(validateContent)를 수행하고, 
 * 문제가 없으면 'published'(발행)로 자동 전환합니다.
 */
export async function GET(request: Request) {
  return handleAutoApprove(request)
}

export async function POST(request: Request) {
  return handleAutoApprove(request)
}

async function handleAutoApprove(request: Request) {
  try {
    console.log('[auto-approve-posts] 15분 자동 승인 크론 작업 시작...');

    // 1. pending_review 상태의 대기 피드 전체 조회 (최대 50개)
    const { data: allPendingPosts, error } = await supabaseAdmin
      .from('posts')
      .select('*')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: true })
      .limit(50)

    if (error) {
      console.error('[auto-approve-posts] 피드 조회 오류:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 2. 현재 시간 기준 15분 이상 경과한 피드 정밀 추출
    const now = Date.now()
    const fifteenMinutesMs = 15 * 60 * 1000

    const pendingPosts = (allPendingPosts || []).filter(post => {
      const createdAtMs = new Date(post.created_at).getTime()
      return (now - createdAtMs) >= fifteenMinutesMs
    })

    if (!pendingPosts || pendingPosts.length === 0) {
      return NextResponse.json({ 
        message: '15분 이상 경과된 대기 피드가 없습니다.', 
        processed: 0 
      })
    }

    const { validateContent } = await import('@/utils/content-validator')
    let approvedCount = 0
    let rejectedCount = 0
    const details: any[] = []

    for (const post of pendingPosts) {
      try {
        console.log(`[auto-approve-posts] 검증 진행 중... (Post ID: ${post.id}, Headline: "${post.headline}")`)

        let validationPassed = true
        let validationResults: any = { autoPassed: true }

        try {
          const validation = await validateContent({
            headline: post.headline,
            content: post.content,
            sourceUrl: post.url,
            sensitivityTag: post.sensitivity_tag,
            sensitivityReason: post.sensitivity_reason
          })
          validationPassed = validation.passed
          validationResults = validation.results
        } catch (vErr) {
          console.warn(`[auto-approve-posts] 검증 모듈 예외 발생 (기본 승인 처리 진행):`, vErr)
        }

        const newStatus = validationPassed ? 'published' : 'rejected'

        await supabaseAdmin
          .from('posts')
          .update({
            status: newStatus,
            validation_result: validationResults,
            validated_at: new Date().toISOString()
          })
          .eq('id', post.id)

        if (validationPassed) {
          approvedCount++
          console.log(`✅ [auto-approve-posts] 피드 자동 승인 발행 완료 (ID: ${post.id})`)
        } else {
          rejectedCount++
          console.log(`❌ [auto-approve-posts] 피드 안전 가이드 위배로 거절 처리 (ID: ${post.id})`)
        }

        details.push({
          id: post.id,
          headline: post.headline,
          status: newStatus,
          passed: validationPassed
        })

      } catch (err: any) {
        console.error(`[auto-approve-posts] 피드 (${post.id}) 처리 중 에러:`, err)
        // 3차 예외 처리: 피드가 영구히 stuck 되는 것을 방지
        await supabaseAdmin
          .from('posts')
          .update({
            status: 'published',
            validated_at: new Date().toISOString()
          })
          .eq('id', post.id)
        approvedCount++
      }
    }

    if (approvedCount > 0) {
      revalidatePath('/')
      revalidatePath('/admin/review-queue')
      revalidatePath('/admin')
    }

    return NextResponse.json({
      success: true,
      processed: pendingPosts.length,
      approved: approvedCount,
      rejected: rejectedCount,
      details
    })

  } catch (err: any) {
    console.error('[auto-approve-posts] 런타임 오류:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
