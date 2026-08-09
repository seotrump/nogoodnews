'use server'

import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { isAdmin } from '@/utils/auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://missing-url',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'missing-key'
);

async function checkAdminAuth() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) throw new Error('Unauthorized admin access');
  return user;
}

// ----------------------------------------------------
// 1. 가이드라인 (moderation_rules) 관련 Actions
// ----------------------------------------------------

export async function toggleModerationRule(ruleId: string, isActive: boolean) {
  const user = await checkAdminAuth();

  const { error } = await supabaseAdmin
    .from('moderation_rules')
    .update({ 
      is_active: isActive, 
      updated_at: new Date().toISOString()
    })
    .eq('id', ruleId);

  if (error) {
    if (error.message.includes('schema cache') || error.message.includes('relation "public.moderation_rules" does not exist')) {
      throw new Error('Supabase DB에 moderation_rules 테이블 생성이 필요합니다. 마이그레이션 SQL(supabase/migrations/20260809000002_create_moderation_rules.sql)을 실행해 주세요.');
    }
    throw new Error(`규칙 활성화 변경 실패: ${error.message}`);
  }
  revalidatePath('/admin');
}

export async function updateModerationRule(formData: FormData) {
  const user = await checkAdminAuth();
  const ruleId = formData.get('ruleId') as string;
  const ruleLabel = formData.get('ruleLabel') as string;
  const rulePrompt = formData.get('rulePrompt') as string;
  const severity = formData.get('severity') as string;

  const { error } = await supabaseAdmin
    .from('moderation_rules')
    .update({
      rule_label: ruleLabel,
      rule_prompt: rulePrompt,
      severity: severity,
      updated_at: new Date().toISOString()
    })
    .eq('id', ruleId);

  if (error) {
    if (error.message.includes('schema cache') || error.message.includes('relation "public.moderation_rules" does not exist')) {
      throw new Error('Supabase DB에 moderation_rules 테이블 생성이 필요합니다. 마이그레이션 SQL(supabase/migrations/20260809000002_create_moderation_rules.sql)을 실행해 주세요.');
    }
    throw new Error(`규칙 수정 실패: ${error.message}`);
  }
  revalidatePath('/admin');
}

export async function createModerationRule(formData: FormData) {
  const user = await checkAdminAuth();
  const ruleKey = formData.get('ruleKey') as string;
  const ruleLabel = formData.get('ruleLabel') as string;
  const rulePrompt = formData.get('rulePrompt') as string;
  const severity = (formData.get('severity') as string) || 'block';

  if (!ruleKey || !ruleLabel || !rulePrompt) {
    throw new Error('모든 필수 항목을 입력하세요.');
  }

  const { error } = await supabaseAdmin
    .from('moderation_rules')
    .insert({
      rule_key: ruleKey.trim().toLowerCase().replace(/\s+/g, '_'),
      rule_label: ruleLabel,
      rule_prompt: rulePrompt,
      severity: severity,
      is_active: true
    });

  if (error) {
    if (error.message.includes('schema cache') || error.message.includes('relation "public.moderation_rules" does not exist')) {
      throw new Error('Supabase DB에 moderation_rules 테이블 생성이 필요합니다. 마이그레이션 SQL(supabase/migrations/20260809000002_create_moderation_rules.sql)을 실행해 주세요.');
    }
    throw new Error(`새 규칙 추가 실패: ${error.message}`);
  }
  revalidatePath('/admin');
}


// ----------------------------------------------------
// 2. 검토대기함 (posts status) 관련 Actions
// ----------------------------------------------------

export async function approvePost(postId: string) {
  await checkAdminAuth();

  const { error } = await supabaseAdmin
    .from('posts')
    .update({ 
      status: 'published',
      validated_at: new Date().toISOString()
    })
    .eq('id', postId);

  if (error) throw new Error(`피드 발행 승인 실패: ${error.message}`);
  revalidatePath('/admin/review-queue');
  revalidatePath('/');
}

export async function deletePostPermanently(postId: string) {
  await checkAdminAuth();

  const { error } = await supabaseAdmin
    .from('posts')
    .delete()
    .eq('id', postId);

  if (error) throw new Error(`피드 삭제 실패: ${error.message}`);
  revalidatePath('/admin/review-queue');
  revalidatePath('/');
}
