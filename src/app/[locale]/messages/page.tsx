import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ChatWindow from '@/components/ChatWindow'
import { setRequestLocale } from 'next-intl/server'

export default async function MessagesPage({ searchParams, params }: { searchParams: Promise<{ u?: string }>, params: Promise<{ locale: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { locale } = await params
  setRequestLocale(locale)

  if (!user) {
    redirect('/login')
  }

  const { u: selectedUserId } = await searchParams

  // 1. 대화 목록 가져오기 (RPC 호출)
  const { data: convData, error } = await supabase.rpc('get_conversations', { p_user_id: user.id })
  let conversations = convData || []

  // 2. 만약 selectedUserId가 있는데 대화 목록에 없다면 (새로운 대화)
  if (selectedUserId && !conversations.find((c: any) => c.other_user_id === selectedUserId)) {
    conversations = [{ other_user_id: selectedUserId, last_message: '', last_created_at: new Date().toISOString(), unread_count: 0 }, ...conversations]
  }

  // 3. 각 대화 상대방의 프로필 정보 가져오기
  const otherUserIds = conversations.map((c: any) => c.other_user_id)
  const { data: profiles } = await supabase
    .from('accounts')
    .select('id, username, display_name, avatar_url, is_ai')
    .in('id', otherUserIds)

  const profileMap = (profiles || []).reduce((acc: any, p: any) => {
    acc[p.id] = p
    return acc
  }, {})

  conversations = conversations.map((c: any) => ({
    ...c,
    profile: profileMap[c.other_user_id]
  })).filter((c: any) => c.profile)

  // 4. 현재 선택된 유저 프로필
  const activeUser = selectedUserId ? profileMap[selectedUserId] : (conversations[0]?.profile || null)

  return (
    <div className="max-w-6xl mx-auto px-4 mt-6 h-[calc(100vh-120px)] flex flex-col md:flex-row gap-6">
      
      {/* 좌측: 대화 목록 */}
      <div className={`w-full md:w-80 flex-shrink-0 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col ${activeUser ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b">
          <h2 className="font-bold text-lg text-gray-900">메시지</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              대화 내역이 없습니다.<br/>프로필에서 메시지를 보내보세요!
            </div>
          ) : (
            conversations.map((conv: any) => (
              <Link 
                key={conv.other_user_id} 
                href={`/messages?u=${conv.other_user_id}`}
                className={`flex items-center gap-3 p-4 border-b border-gray-100 hover:bg-gray-50 transition ${activeUser?.id === conv.other_user_id ? 'bg-blue-50/50' : ''}`}
              >
                {conv.profile.avatar_url ? (
                  <img src={conv.profile.avatar_url} className="w-12 h-12 rounded-full object-cover border" alt="" />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">?</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="font-bold text-gray-900 truncate pr-2 flex items-center gap-1">
                      {conv.profile.display_name}
                      {conv.profile.is_ai && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">AI</span>}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 truncate">{conv.last_message || '새로운 대화'}</div>
                </div>
                {conv.unread_count > 0 && (
                  <div className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shrink-0">
                    {conv.unread_count}
                  </div>
                )}
              </Link>
            ))
          )}
        </div>
      </div>

      {/* 우측: 채팅창 */}
      <div className={`flex-1 ${!activeUser ? 'hidden md:flex md:items-center md:justify-center' : 'block'}`}>
        {activeUser ? (
          <div className="h-full">
            <div className="md:hidden mb-4">
              <Link href="/messages" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                목록으로
              </Link>
            </div>
            <ChatWindow currentUserId={user.id} otherUser={activeUser} />
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 opacity-50"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
            <p>대화 상대를 선택하세요</p>
          </div>
        )}
      </div>

    </div>
  )
}
