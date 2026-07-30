'use client'

import { useState } from 'react'
import { Link } from '@/i18n/routing'
import { toast } from 'react-hot-toast'
import ReactionPanel from './ReactionPanel'

export default function PostContentClient({ 
  initialHeadline, 
  initialContent,
  isDetail,
  postId,
  initialReactions,
  currentUserId,
  locale
}: { 
  initialHeadline: string, 
  initialContent: string,
  isDetail: boolean,
  postId: string,
  initialReactions: any[],
  currentUserId?: string,
  locale?: string
}) {
  const [headline, setHeadline] = useState(initialHeadline)
  const [content, setContent] = useState(initialContent)

  const renderWithHashtags = (text: string, isHashtagLine: boolean = false) => {
    if (!text) return null;
    const parts = text.split(/(#[\w가-힣-]+)/g);
    const rendered = parts.map((part, i) => {
      if (part.startsWith('#')) {
        const tag = part.slice(1);
        return (
          <Link 
            key={i} 
            href={`/tags/${encodeURIComponent(tag)}`} 
            className="text-blue-600 hover:underline inline-block mr-1.5 font-medium" 
            onClick={e => e.stopPropagation()}
          >
            {part}
          </Link>
        );
      }
      return part;
    });

    if (isHashtagLine) {
      return (
        <div className="flex flex-nowrap overflow-hidden text-ellipsis whitespace-nowrap gap-1">
          {rendered}
        </div>
      )
    }

    return rendered;
  }

  const contentParagraphs = content.split('\n')
  const bodyParagraphs = contentParagraphs.slice(0, -1)
  const lastParagraph = contentParagraphs[contentParagraphs.length - 1] || ''
  const isHashtagLastLine = lastParagraph.includes('#')

  return (
    <div className="mt-1">
      <div>
        <h2 className={`text-[20px] font-bold text-gray-900 leading-tight break-keep text-justify ${!isDetail ? 'mb-2 hover:text-blue-600 transition' : 'mb-6'}`}>
          {renderWithHashtags(headline)}
        </h2>
        <div className={`text-gray-700 text-[16px] leading-relaxed text-justify ${!isDetail ? 'line-clamp-2 hover:text-gray-900' : ''}`}>
          {(isHashtagLastLine ? bodyParagraphs : contentParagraphs).map((paragraph, index) => (
            <div key={index} className="mb-3 last:mb-0 min-h-[1em]">
              {renderWithHashtags(paragraph)}
            </div>
          ))}
        </div>
        {isHashtagLastLine && (
          <div className="mt-3 text-sm flex flex-nowrap overflow-hidden text-ellipsis whitespace-nowrap gap-1">
            {renderWithHashtags(lastParagraph, true)}
          </div>
        )}
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
