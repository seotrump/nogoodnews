import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // 1. 크론 시크릿 키 검증
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET_KEY && authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 2. DB에서 자동생성 설정 가져오기
  const { data: settings } = await supabaseAdmin
    .from('site_settings')
    .select('is_auto_feed_active, auto_feed_target_count')
    .eq('id', 'global')
    .single()

  if (!settings || !settings.is_auto_feed_active) {
    return NextResponse.json({ message: 'Auto feed generation is disabled' })
  }

  const targetCount = settings.auto_feed_target_count || 30

  // 3. 현재 pending_review (검토대기) 상태의 봇 작성 피드 개수 확인
  const { count, error: countError } = await supabaseAdmin
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending_review')

  if (countError) {
    return NextResponse.json({ error: 'Failed to count pending posts' }, { status: 500 })
  }

  // 4. 목표 개수에 도달했으면 생성 스킵
  if (count !== null && count >= targetCount) {
    return NextResponse.json({ message: `Target count (${targetCount}) reached. Currently ${count} pending posts. Skipping.` })
  }

  // 5. ai-feed-trigger 를 내부적으로 호출하여 피드 생성 진행 (1개씩)
  // Vercel Cron 등에서는 호스트 주소가 필요하므로 
  // NEXT_PUBLIC_SITE_URL 환경변수를 활용합니다.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  
  try {
    const triggerRes = await fetch(`${siteUrl}/api/ai-feed-trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (!triggerRes.ok) {
      const err = await triggerRes.text()
      console.error('Trigger failed:', err)
      return NextResponse.json({ error: 'Failed to trigger feed generation', details: err }, { status: 500 })
    }
    
    const triggerData = await triggerRes.json()
    return NextResponse.json({ message: 'Feed generated successfully', target: targetCount, current: (count || 0) + 1, details: triggerData })
  } catch (e: any) {
    console.error('Error triggering feed:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
