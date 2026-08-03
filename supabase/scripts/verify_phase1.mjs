import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
)

// 1. trait_axes 조회
const { data: axes, error: axErr } = await sb
  .from('trait_axes')
  .select('axis_key, axis_group, label_ko')
  .order('sort_order')

if (axErr) {
  console.error('trait_axes 조회 실패:', axErr.message)
} else {
  console.log(`✅ trait_axes (${axes.length}개):`)
  axes.forEach(a => console.log(`  [${a.axis_group}] ${a.axis_key}: ${a.label_ko}`))
}

// 2. accounts 컬럼 확인
const { data: acc, error: accErr } = await sb
  .from('accounts')
  .select('axis_profile, type_code')
  .limit(1)

if (accErr) {
  console.error('❌ accounts 컬럼 없음:', accErr.message)
} else {
  console.log('✅ accounts.axis_profile / type_code 컬럼 존재 확인')
}

// 3. type-code 유틸 단위 테스트
const { runTypeCodeTests } = await import('../../src/utils/type-code.ts')
const result = runTypeCodeTests()
if (result.failed === 0) {
  console.log(`✅ type-code 단위 테스트: ${result.passed}/${result.passed + result.failed} 통과`)
} else {
  console.error('❌ 단위 테스트 실패:', result.errors)
}
