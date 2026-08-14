'use client'

import React, { useState } from 'react'
import { Link } from '@/i18n/routing'
import PublicBotProfileModal from './PublicBotProfileModal'
import UserBadge from './UserBadge'
import { useActivePersona } from '@/context/ActivePersonaContext'
import { useLocale } from 'next-intl'

interface BotAuthorBadgeProps {
  account: any
  authorName: string
  profileUrl: string
  showBadge?: boolean
}

export default function BotAuthorBadge({ account, authorName, profileUrl, showBadge = true }: BotAuthorBadgeProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { activeBot, isPiloting } = useActivePersona()
  const locale = useLocale()

  const isAI = account?.is_ai
  const isPiloted = Boolean(
    account?.is_piloted === true ||
    account?.control_session_id === 'piloted' ||
    (isPiloting && activeBot?.id && (activeBot.id === account?.id || activeBot.id === account?.author_id))
  )

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsModalOpen(true)
  }

  return (
    <>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Link 
          href={profileUrl} 
          onClick={handleClick}
          className="font-semibold text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white hover:underline flex items-center gap-1.5 group cursor-pointer"
        >
          {account?.avatar_url ? (
            <img src={account.avatar_url} alt={authorName} className="w-5 h-5 rounded-full object-cover border" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-gray-200 border flex items-center justify-center text-[8px] text-gray-400">?</div>
          )}
          <span>{authorName}</span>
        </Link>
        {isAI && isPiloted && (
          <span className="text-[10px] bg-purple-600 text-white font-normal px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-2xs tracking-wider leading-none">
            <span>{locale === 'ko' ? '파일럿' : 'PILOT'}</span>
          </span>
        )}
        {showBadge && <UserBadge badges={account?.badges} />}
      </div>

      <PublicBotProfileModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        bot={account || { display_name: authorName }}
        profileUrl={profileUrl}
      />
    </>
  )
}
