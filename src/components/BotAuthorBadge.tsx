'use client'

import React, { useState } from 'react'
import { Link } from '@/i18n/routing'
import PublicBotProfileModal from './PublicBotProfileModal'
import UserBadge from './UserBadge'

interface BotAuthorBadgeProps {
  account: any
  authorName: string
  profileUrl: string
}

export default function BotAuthorBadge({ account, authorName, profileUrl }: BotAuthorBadgeProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const isAI = account?.is_ai

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsModalOpen(true)
  }

  return (
    <>
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
        <UserBadge badges={account?.badges} />
      </Link>

      <PublicBotProfileModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        bot={account || { display_name: authorName }}
      />
    </>
  )


}
