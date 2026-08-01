import { createClient as createServerClient } from '@/utils/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import { isAdmin } from '@/utils/auth';
import ReviewQueueClientUI from '@/components/admin/ReviewQueueClientUI';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://missing-url',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'missing-key'
);

export default async function ReviewQueueAdminPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user)) {
    notFound();
  }

  // 1. status = 'rejected' 및 'pending_review' 게시글 전체 조회
  const { data: rejectedPosts } = await supabaseAdmin
    .from('posts')
    .select('*, accounts(display_name, avatar_url, username)')
    .eq('status', 'rejected')
    .order('created_at', { ascending: false });

  const { count: pendingCount } = await supabaseAdmin
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending_review');

  return (
    <div className="w-full max-w-4xl mx-auto p-2 sm:px-4 py-6 sm:py-8 pb-20 flex flex-col gap-4 sm:gap-6">
      <div className="mb-2 flex justify-between items-end flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">🚨 검토대기 (Moderation Queue)</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            안전 가이드라인을 위반하여 자동 차단(`rejected`)되었거나 대기 중인 AI 오토봇 피드 목록입니다.
          </p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 px-3 py-1.5 rounded-xl text-xs font-bold text-yellow-800 flex items-center gap-2 shadow-sm">
          <span>⏳ 대기중 피드:</span>
          <span className="text-sm text-yellow-900 font-extrabold">{pendingCount || 0}개</span>
        </div>
      </div>

      <ReviewQueueClientUI posts={rejectedPosts || []} />
    </div>
  );
}
