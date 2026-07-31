import { Link } from '@/i18n/routing'
import { isAdmin } from '@/utils/auth'
import DeletePostButton from './DeletePostButton'
import { Eye, MessageSquare } from 'lucide-react'

import ReactionPanel from './ReactionPanel'
import { getUserProfileUrl } from '@/utils/user'

import PostContentClient from './PostContentClient'
import ClickableArea from './ClickableArea'
import { useTranslations, useLocale } from 'next-intl'
import UserBadge from './UserBadge'

export default function PostCard({ post, isDetail = false, currentUser, hideDeleteButton = false }: { post: any, isDetail?: boolean, currentUser?: any, hideDeleteButton?: boolean }) {
  const t = useTranslations('PostCard');
  const locale = useLocale();
  const date = new Date(post.created_at).toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US')
  const authorName = post.accounts?.display_name || t('anonymous')
  const isAI = post.accounts?.is_ai
  const avatarUrl = post.accounts?.avatar_url

  let displayHeadline = post.headline;
  let displayContent = post.content;
  let originalHeadline = post.link_title || null;

  if (isAI && post.content) {
    const lines = post.content.split('\n').filter((l: string) => l.trim() !== '');
    if (lines.length > 1) {
      if (!originalHeadline) originalHeadline = post.headline;
      displayHeadline = lines[0];
      displayContent = lines.slice(1).join('\n');
    }
  }

  // Strip '#' symbols from displayHeadline if present
  if (displayHeadline) {
    displayHeadline = displayHeadline.replace(/#/g, '').trim();
  }

  const contentNode = (
    <PostContentClient 
      initialHeadline={displayHeadline} 
      initialContent={displayContent} 
      isDetail={isDetail}
      postId={post.id}
      initialReactions={post.reactions || []}
      currentUserId={currentUser?.id}
      locale={locale}
      category={post.category}
      accountCategory={post.accounts?.category}
    />
  )

  const wrappedContentNode = !isDetail ? (
    <ClickableArea href={`/posts/${post.id}`}>
      {contentNode}
    </ClickableArea>
  ) : contentNode;

  return (
    <div className="relative bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
      {isAdmin(currentUser) && !hideDeleteButton && (
        <DeletePostButton postId={post.id} isDetail={isDetail} />
      )}

      {post.image_url && (
        <div className={`mb-3 w-full bg-gray-100 rounded-xl overflow-hidden border border-gray-100 ${!isDetail ? 'h-40 sm:h-56' : 'h-48 sm:h-64 max-h-64'}`}>
          {!isDetail ? (
            <ClickableArea href={`/posts/${post.id}`} className="w-full h-full block">
              <img 
                src={post.image_url} 
                alt="첨부 이미지" 
                className="w-full h-full object-cover object-center hover:opacity-90 transition"
              />
            </ClickableArea>
          ) : (
            <img 
              src={post.image_url} 
              alt="첨부 이미지" 
              className="w-full h-full object-contain"
            />
          )}
        </div>
      )}

      {post.url && (
        <div className="mb-3 w-full bg-blue-50 px-2 py-1.5 rounded flex flex-col gap-0.5 border border-blue-100">
          <a href={post.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-500 hover:underline block truncate pr-12">
            {t('readOriginal')}: {
              (() => {
                try {
                  const u = new URL(post.url)
                  if (u.hostname.includes('news.google.com') && u.pathname.includes('/rss/articles/')) {
                    return 'news.google.com/rss/articles/...'
                  }
                  return u.hostname + (u.pathname.length > 20 ? u.pathname.substring(0, 20) + '...' : u.pathname)
                } catch {
                  return post.url.length > 40 ? post.url.substring(0, 40) + '...' : post.url
                }
              })()
            }
          </a>
          {originalHeadline && (
            <span className="text-xs text-gray-500 truncate pr-2">
              원문: {originalHeadline}
            </span>
          )}
        </div>
      )}
      
      <div className="mb-4">
        {wrappedContentNode}
      </div>

      <div className="text-xs text-gray-400 flex items-center justify-between border-t pt-3 mt-2">
        <div className="flex items-center gap-2">
          <Link href={getUserProfileUrl(post)} className="flex items-center gap-2 font-semibold text-gray-600 hover:text-black hover:underline">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-5 h-5 rounded-full object-cover border" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gray-200 border flex items-center justify-center text-[8px] text-gray-400">?</div>
            )}
            <span>{authorName}</span>
          </Link>
          <UserBadge badges={post.accounts?.badges} />

          {isDetail && (post.category || post.accounts?.category) && (
            (() => {
              const catKey = post.category || post.accounts?.category;
              const catMap: Record<string, string> = {
                politics: locale === 'ko' ? '정치' : 'Politics',
                economy: locale === 'ko' ? '경제' : 'Economy',
                society: locale === 'ko' ? '사회' : 'Society',
                tech: locale === 'ko' ? 'IT/기술' : 'IT/Tech',
                world: locale === 'ko' ? '세계' : 'World',
                entertainment: locale === 'ko' ? '연예' : 'Entertainment',
                sports: locale === 'ko' ? '스포츠' : 'Sports',
                culture: locale === 'ko' ? '생활/문화' : 'Life/Culture',
                opinion: locale === 'ko' ? '오피니언' : 'Opinion'
              };
              return (
                <Link 
                  href={`/?category=${catKey}`} 
                  className="text-[11px] font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 px-2 py-0.5 rounded-lg transition-colors inline-block"
                >
                  {catMap[catKey] || catKey}
                </Link>
              );
            })()
          )}
        </div>
        <div className="flex items-center gap-4 text-gray-500 font-medium">
          <div className="flex items-center gap-1" title="조회수">
            <Eye className="w-3.5 h-3.5" />
            <span>{post.views_count || 0}</span>
          </div>
          <div className="flex items-center gap-1" title="댓글수">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{post.comments_count || 0}</span>
          </div>
          <span className="text-gray-400 font-normal">{date}</span>
          {isDetail && currentUser && (post.author_id === currentUser.id || isAdmin(currentUser)) && (
            <Link href={`/posts/${post.id}/edit`} className="ml-1 text-blue-500 hover:text-blue-700 font-bold transition">
              {t('edit')}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
