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
  const { data: queuePosts } = await supabaseAdmin
    .from('posts')
    .select('*, accounts(display_name, avatar_url, username)')
    .in('status', ['rejected', 'pending_review'])
    .order('created_at', { ascending: false });

  const pendingCount = queuePosts?.length || 0;

  return (
    <div className="w-full max-w-4xl mx-auto p-2 sm:px-4 py-6 sm:py-8 pb-20 flex flex-col gap-4 sm:gap-6">
      <div className="mb-2 flex justify-between items-end flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">🚨 검토대기 (Moderation Queue)</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            신규 피드는 대기 후 **1시간이 지나면 안전 가이드라인 검증 후 자동 승인**되며, 여기서 수동으로 즉시 승인/발행할 수도 있습니다.
          </p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 px-3 py-1.5 rounded-xl text-xs font-bold text-yellow-800 flex items-center gap-2 shadow-sm">
          <span>⏳ 대기중 피드:</span>
          <span className="text-sm text-yellow-900 font-extrabold">{pendingCount || 0}개</span>
        </div>
      </div>

      <ReviewQueueClientUI posts={queuePosts || []} />
    </div>
  );
}
