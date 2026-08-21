'use client'

import { useState, useEffect } from 'react'
import { Link, useRouter } from '@/i18n/routing'
import ChatWindow from '@/components/ChatWindow'
import GroupChatWindow from '@/components/GroupChatWindow' // Will create this next
import DeleteConversationButton from '@/components/DeleteConversationButton'
import { deleteConversation, leaveGroupChat } from './actions'
import CreateGroupChatModal from '@/components/CreateGroupChatModal'
import CreateDMModal from '@/components/CreateDMModal'
import { Users, Plus, Search } from 'lucide-react'

export default function MessagesClientWrapper({
  conversations,
  activeUser,
  activeGroup,
  effectiveUserId,
  isPilotingBot,
  pilotBotProfile,
  displayUserId
}: {
  conversations: any[]
  activeUser: any
  activeGroup: any
  effectiveUserId: string
  isPilotingBot: boolean
  pilotBotProfile: any
  displayUserId: string
}) {
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const [showCreateDMModal, setShowCreateDMModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'dm' | 'group'>('dm')
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  // 만약 1:1 대화방이 전혀 없고 그룹 채팅방만 있다면, 기본 탭을 'group'으로 자동 변경합니다.
  useEffect(() => {
    const hasDMs = conversations.some(c => !c.is_group)
    const hasGroups = conversations.some(c => c.is_group)
    if (!hasDMs && hasGroups && activeTab === 'dm') {
      setActiveTab('group')
    } else if (hasDMs && !hasGroups && activeTab === 'group') {
      setActiveTab('dm')
    }
  }, [conversations, activeTab])

  const handleDeleteDM = async (userId: string) => {
    await deleteConversation(userId)
    router.push('/messages')
    router.refresh()
  }

  const handleDeleteGroup = async (roomId: string) => {
    await leaveGroupChat(roomId)
    router.push('/messages')
    router.refresh()
  }

  const filteredConversations = conversations.filter((c: any) => {
    // 탭 필터링
    if (activeTab === 'group' && !c.is_group) return false
    if (activeTab === 'dm' && c.is_group) return false
    
    // 검색어 필터링
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      if (c.is_group) {
        const roomName = (c.room_name || '그룹 채팅').toLowerCase()
        if (!roomName.includes(q)) return false
      } else {
        const userName = (c.profile?.display_name || '').toLowerCase()
        if (!userName.includes(q)) return false
      }
    }
    return true
  })

  return (
    <div className="max-w-6xl mx-auto px-4 mt-4 md:mt-6 h-[calc(100vh-180px)] md:h-[calc(100vh-120px)] pb-16 md:pb-0 flex flex-col md:flex-row gap-4 md:gap-6">
      {/* 좌측: 대화 목록 */}
      <div className={`w-full md:w-80 flex-shrink-0 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col ${activeUser || activeGroup ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-lg text-gray-900">
            {isPilotingBot && pilotBotProfile ? `${pilotBotProfile.display_name} 메시지함` : '메시지'}
          </h2>
          <button 
            onClick={() => {
              if (activeTab === 'group') {
                setShowCreateGroupModal(true)
              } else {
                setShowCreateDMModal(true)
              }
            }}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
            title={activeTab === 'group' ? "새 그룹 채팅 만들기" : "새 대화 시작하기"}
          >
            <Plus size={20} />
          </button>
        </div>
        <div className="p-3 border-b border-gray-100 bg-gray-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder={activeTab === 'group' ? '방 이름으로 검색...' : '이름으로 검색...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
        </div>
        <div className="flex border-b border-gray-100 px-2 pt-2">
          <button
            onClick={() => setActiveTab('dm')}
            className={`flex-1 py-2 text-sm font-semibold border-b-2 transition ${activeTab === 'dm' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            1:1 DM
          </button>
          <button
            onClick={() => setActiveTab('group')}
            className={`flex-1 py-2 text-sm font-semibold border-b-2 transition ${activeTab === 'group' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            그룹 채팅
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              {activeTab === 'dm' ? '진행 중인 1:1 대화가 없습니다.' : '참여 중인 그룹 채팅이 없습니다.'}<br/>
              우측 상단 + 버튼으로 새로운 대화를 시작해 보세요!
            </div>
          ) : (
            filteredConversations.map((conv: any) => (
              <div 
                key={conv.room_id || conv.other_user_id} 
                className="relative group block border-b border-gray-100 hover:bg-gray-50 transition"
              >
                <Link 
                  href={conv.is_group ? `/messages?group=${conv.room_id}` : `/messages?u=${conv.other_user_id}`}
                  className={`flex items-center gap-3 p-4 w-full h-full pr-10 ${(activeUser?.id === conv.other_user_id) || (activeGroup?.id === conv.room_id) ? 'bg-blue-50/50' : ''}`}
                >
                {conv.is_group ? (
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center border shrink-0">
                    <Users size={20} />
                  </div>
                ) : (
                  conv.profile?.avatar_url ? (
                    <img src={conv.profile.avatar_url} className="w-12 h-12 rounded-full object-cover border shrink-0" alt="" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500 shrink-0">?</div>
                  )
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="font-bold text-gray-900 truncate pr-2 flex items-center gap-1">
                      {conv.is_group ? (conv.room_name || '그룹 채팅') : conv.profile?.display_name}
                      {!conv.is_group && conv.profile?.is_ai && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">AI</span>}
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
                  {!conv.is_group ? (
                    <form className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
                      <DeleteConversationButton 
                        onAction={async () => await handleDeleteDM(conv.other_user_id)} 
                        title="대화방에서 나가기" 
                      />
                    </form>
                  ) : (
                    <form className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
                      <DeleteConversationButton 
                        onAction={async () => await handleDeleteGroup(conv.room_id)} 
                        title="그룹방에서 나가기" 
                      />
                    </form>
                  )}
                </div>
              ))
          )}
        </div>
      </div>

      {/* 우측: 채팅창 */}
      <div className={`flex-1 ${!activeUser && !activeGroup ? 'hidden md:flex md:items-center md:justify-center' : 'block'}`}>
        {activeUser ? (
          <div className="h-full">
            <div className="md:hidden mb-4">
              <Link href="/messages" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                목록으로
              </Link>
            </div>
            <ChatWindow currentUserId={effectiveUserId} otherUser={activeUser} displayUserId={displayUserId} />
          </div>
        ) : activeGroup ? (
          <div className="h-full">
            <div className="md:hidden mb-4">
              <Link href="/messages" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                목록으로
              </Link>
            </div>
            <GroupChatWindow currentUserId={effectiveUserId} room={activeGroup} />
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 opacity-50"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
            <p>대화 상대를 선택하거나 그룹 채팅을 시작하세요</p>
          </div>
        )}
      </div>

      {showCreateGroupModal && <CreateGroupChatModal onClose={() => setShowCreateGroupModal(false)} />}
      {showCreateDMModal && <CreateDMModal onClose={() => setShowCreateDMModal(false)} currentUserId={effectiveUserId} />}
    </div>
  )
}
