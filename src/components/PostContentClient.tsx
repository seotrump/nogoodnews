'use client'

import { useState } from 'react'
// Note: getTranslations is for server components, we need useTranslations for client components.
import { toast } from 'react-hot-toast'
import ReactionPanel from './ReactionPanel'

export default function PostContentClient({ 
  initialHeadline, 
  initialContent,
  isDetail,
  postId,
  initialReactions,
  currentUserId
}: { 
  initialHeadline: string, 
  initialContent: string,
  isDetail: boolean,
  postId: string,
  initialReactions: any[],
  currentUserId?: string
}) {
  const [headline, setHeadline] = useState(initialHeadline)
  const [content, setContent] = useState(initialContent)

  const renderWithHashtags = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(#[\w가-힣]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        const tag = part.slice(1);
        return <a key={i} href={`/tags/${encodeURIComponent(tag)}`} className="text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>{part}</a>;
      }
      return part;
    });
  }

  return (
    <div className="mt-1">
      <div>
        <h2 className={`text-[20px] font-bold text-gray-900 leading-tight break-keep ${!isDetail ? 'mb-2 hover:text-blue-600 transition' : 'mb-6'}`}>
          {renderWithHashtags(headline)}
        </h2>
        <div className={`text-gray-700 text-[16px] leading-relaxed text-justify ${!isDetail ? 'line-clamp-2 hover:text-gray-900' : ''}`}>
          {content.split('\n').map((paragraph, index) => (
            <p key={index} className="mb-3 last:mb-0 min-h-[1em]">
              {renderWithHashtags(paragraph)}
            </p>
          ))}
        </div>
      </div>
      
      <ReactionPanel 
        targetType="post" 
        targetId={postId} 
        initialReactions={initialReactions} 
        currentUser={{ id: currentUserId }}
      />
    </div>
  )
}
