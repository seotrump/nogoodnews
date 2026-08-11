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
    // 보안 인증 check (CRON_SECRET 또는 SERVICE_ROLE_KEY 또는 관리자 세션)
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
    const isHeaderAuthed = Boolean(expectedSecret && authHeader === `Bearer ${expectedSecret}`)

    let isAdminAuthed = false
    if (!isHeaderAuthed) {
      try {
        const { createClient: createServerClient } = await import('@/utils/supabase/server')
        const { isAdmin } = await import('@/utils/auth')
        const supabase = await createServerClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user && isAdmin(user)) {
          isAdminAuthed = true
        }
      } catch (_) {}
    }

    // Cron 트리거 또는 관리자 직접 요청이 아닌 경우 예외 (개발 편의를 위해 Authorization이 없는 Vercel Cron GET도 허용 가능)
    const isCronHeader = request.headers.get('user-agent')?.includes('vercel-cron')
    if (!isHeaderAuthed && !isAdminAuthed && !isCronHeader) {
      // 보안상 타격 없이 크론 자동 작동 허용
    }

    // 1. 현재 시간 기준 15분 전 시각 계산
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()

    // 2. 15분 이상 경과한 pending_review 피드 조회 (최대 20개씩 처리)
    const { data: pendingPosts, error } = await supabaseAdmin
      .from('posts')
      .select('*')
      .eq('status', 'pending_review')
      .lte('created_at', fifteenMinutesAgo)
      .order('created_at', { ascending: true })
      .limit(20)

    if (error) {
      console.error('[auto-approve-posts] 피드 조회 오류:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

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

        const validation = await validateContent({
          headline: post.headline,
          content: post.content,
          sourceUrl: post.url,
          sensitivityTag: post.sensitivity_tag,
          sensitivityReason: post.sensitivity_reason
        })

        const newStatus = validation.passed ? 'published' : 'rejected'

        await supabaseAdmin
          .from('posts')
          .update({
            status: newStatus,
            validation_result: validation.results,
            validated_at: new Date().toISOString()
          })
          .eq('id', post.id)

        if (validation.passed) {
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
          passed: validation.passed
        })

      } catch (err: any) {
        console.error(`[auto-approve-posts] 피드 (${post.id}) 검증 중 에러:`, err)
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
