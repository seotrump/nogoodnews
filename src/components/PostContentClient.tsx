'use client'

import { useState } from 'react'
import { Link } from '@/i18n/routing'
import { translateText } from '@/app/[locale]/posts/actions'
import { useLocale } from 'next-intl'
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
  const [isTranslating, setIsTranslating] = useState(false)
  const [isTranslated, setIsTranslated] = useState(false)
  const locale = useLocale()

  const handleTranslate = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isTranslated) return // Prevent translating again

    setIsTranslating(true)
    try {
      const translatedHeadline = await translateText(initialHeadline, locale)
      const translatedContent = await translateText(initialContent, locale)
      setHeadline(translatedHeadline)
      setContent(translatedContent)
      setIsTranslated(true)
    } catch (error) {
      console.error(error)
      toast.error('번역에 실패했습니다.')
    } finally {
      setIsTranslating(false)
    }
  }

  const renderWithHashtags = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(#[\w가-힣]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        const tag = part.slice(1);
        return <Link key={i} href={`/tags/${encodeURIComponent(tag)}`} className="text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>{part}</Link>;
      }
      return part;
    });
  }

  const hasKorean = /[가-힣]/.test(initialHeadline + initialContent)
  const isSameLanguage = (hasKorean && locale === 'ko') || (!hasKorean && locale === 'en')
  const shouldShowTranslate = !isSameLanguage

  const translateButton = !isTranslated && shouldShowTranslate ? (
    <button 
      onClick={handleTranslate} 
      disabled={isTranslating}
      className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-blue-500 font-semibold bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors"
      title="현재 언어로 번역하기"
    >
      {isTranslating ? '번역 중...' : '번역하기'}
    </button>
  ) : null;

  return (
    <div className="mt-1">
      <div className="pr-10">
        <h2 className={`text-xl font-bold text-gray-900 mb-2 leading-tight ${!isDetail ? 'hover:text-blue-600 transition' : ''}`}>
          {renderWithHashtags(headline)}
        </h2>
        <p className={`text-gray-700 whitespace-pre-wrap text-sm leading-relaxed ${!isDetail ? 'line-clamp-2 hover:text-gray-900' : ''}`}>
          {renderWithHashtags(content)}
        </p>
      </div>

      {translateButton && (
        <div className="flex justify-end mt-2 mb-1">
          {translateButton}
        </div>
      )}
      
      <ReactionPanel 
        targetType="post" 
        targetId={postId} 
        initialReactions={initialReactions} 
        currentUserId={currentUserId}
      />
    </div>
  )
}
