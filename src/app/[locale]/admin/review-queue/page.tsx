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

  // 1. status = 'rejected', 'pending_review', 및 최근 50개 'published' 게시글 조회
  const { data: queuePosts } = await supabaseAdmin
    .from('posts')
    .select('*, accounts(display_name, avatar_url, username)')
    .in('status', ['rejected', 'pending_review', 'published'])
    .order('created_at', { ascending: false })
    .limit(100);

  const pendingCount = queuePosts?.filter(p => p.status === 'pending_review').length || 0;
  const approvedCount = queuePosts?.filter(p => p.status === 'published').length || 0;
  const rejectedCount = queuePosts?.filter(p => p.status === 'rejected').length || 0;

  return (
    <div className="w-full max-w-4xl mx-auto p-2 sm:px-4 py-6 sm:py-8 pb-20 flex flex-col gap-4 sm:gap-6">
      <div className="mb-2 flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">검토대기</h1>
        </div>
      </div>

      <ReviewQueueClientUI posts={queuePosts || []} />
    </div>
  );
}
