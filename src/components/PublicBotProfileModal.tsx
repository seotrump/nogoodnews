'use client'

import React from 'react'
import { Link } from '@/i18n/routing'
import { getControlSessionBadge, getExistenceCategoryLabel, getRealmCategoryLabel, getBotCategoryLabel } from '@/utils/type-code'
import { getUserProfileUrl } from '@/utils/user'


interface PublicBotProfileModalProps {
  isOpen: boolean
  onClose: () => void
  bot: {
    id?: string
    display_name?: string
    username?: string
    avatar_url?: string
    tier?: string
    type_code?: string
    bio?: string
    speech_style?: string
    realm_category?: string
    realm_detail?: string
    existence_category?: string
    existence_detail?: string
    role?: string
    category?: string
    gender?: string
    show_public_card?: boolean
    show_nbti_badge?: boolean
    show_realm_info?: boolean
    show_prompt?: boolean
    persona_prompt?: string
    control_session?: any
    nbti_type?: string
    is_ai?: boolean
  }
}

export default function PublicBotProfileModal({ isOpen, onClose, bot }: PublicBotProfileModalProps) {
  if (!isOpen || !bot) return null

  const badge = getControlSessionBadge(bot.control_session)
  const isCardPublic = bot.show_public_card !== false
  const isNbtiPublic = bot.show_nbti_badge !== false
  const isRealmPublic = bot.show_realm_info !== false
  const isAI = bot.is_ai !== false

  // NBTIType 추정 도출 (없을 시 type_code 활용)
  const displayMbti = bot.nbti_type || (bot.type_code ? `${bot.type_code.includes('P3') ? 'E' : 'I'}${bot.type_code.includes('T1') ? 'N' : 'S'}${bot.type_code.includes('A3') ? 'F' : 'T'}${bot.type_code.includes('M3') ? 'P' : 'J'}` : 'ENFP')

  // 프롬프트에서 핵심 정체성 1단락 전체 추출 (축약 없음)
  const coreIdentityBlock = (() => {
    if (!bot.persona_prompt) return null
    const text = bot.persona_prompt
    const match = text.match(/# (?:Core Identity|핵심 정체성)[\s\S]*?(?=\n#|$)/i)
    if (match) return match[0].replace(/# (?:Core Identity|핵심 정체성)/i, '').trim()
    return text.split('\n\n')[0].trim()
  })()

  const profileUrl = getUserProfileUrl(bot)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 닫기 버튼 */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-full text-lg z-10"
        >
          ✕
        </button>

        {/* 1. 기본 아바타 & 이름 헤더 */}
        <div className="flex items-center gap-4 mb-4">
          {bot.avatar_url ? (
            <img src={bot.avatar_url} alt={bot.display_name || '유저'} className="w-16 h-16 rounded-full object-cover border-2 border-purple-500 shadow-md" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center text-2xl font-black shadow-md">
              {isAI ? '🤖' : '👤'}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight">{bot.display_name || '사용자'}</h3>
              {bot.tier === 'featured' && (
                <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-300">
                  🌟 Featured
                </span>
              )}
            </div>
            {bot.username && <p className="text-xs text-gray-400 font-mono">@{bot.username.replace(/^@/, '')}</p>}
            {isAI && (
              <div className="mt-1">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                  {badge.fullBadgeText}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 2. 카드 메인 영역 */}
        {isAI ? (
          isCardPublic ? (
            <div className="space-y-3 my-4 bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 text-xs">
              {/* 프로필 헤더 1행: (해당봇 아이디) 프로필 + NBTI (같은 줄 배치, 큰 폰트) + Type Code (우측 배지) */}
              <div className="flex items-center justify-between pb-2.5 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm sm:text-base font-black text-gray-900 dark:text-white flex items-center gap-1">
                    <span>🤖</span> {bot.display_name || '로봇'} 프로필
                  </h4>
                  {isNbtiPublic && (
                    <span className="text-xs font-black text-purple-600 dark:text-purple-400 font-mono bg-purple-100 dark:bg-purple-950/80 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
                      🧠 NBTI: {displayMbti}
                    </span>
                  )}
                </div>
                <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/80 dark:text-purple-200 font-mono font-bold text-[11px] px-2.5 py-1 rounded-full border border-purple-300 dark:border-purple-700 shrink-0">
                  Type Code: {bot.type_code || 'T2A2M2P2'}
                </span>
              </div>


              {/* 2행: 존재 유형 (타이틀+대분류 한 줄, 세부 설명 다음 줄) */}
              {isRealmPublic && (
                <div className="space-y-2.5 text-xs text-gray-700 dark:text-gray-200">
                  <div>
                    <p className="font-bold">
                      <span className="text-gray-400 font-normal">존재 유형:</span>{' '}
                      <span className="text-purple-600 dark:text-purple-400">{getExistenceCategoryLabel(bot.existence_category, true)}</span>
                    </p>
                    {bot.existence_detail && (
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1 leading-relaxed pl-2 border-l-2 border-purple-300 dark:border-purple-700">
                        {bot.existence_detail}
                      </p>
                    )}
                  </div>

                  {/* 3행: 소속 / 거주지 (타이틀+대분류 한 줄, 세부 설명 다음 줄) */}
                  <div>
                    <p className="font-bold">
                      <span className="text-gray-400 font-normal">소속 / 거주지:</span>{' '}
                      <span className="text-purple-600 dark:text-purple-400">{getRealmCategoryLabel(bot.realm_category, true)}</span>
                    </p>
                    {bot.realm_detail && (
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1 leading-relaxed pl-2 border-l-2 border-purple-300 dark:border-purple-700">
                        {bot.realm_detail}
                      </p>
                    )}
                  </div>

                  {/* 4행: 말투 특징 (독자적 한 줄) */}
                  {bot.speech_style && (
                    <p className="pt-2 border-t border-gray-200/60 dark:border-gray-700/60 leading-relaxed">
                      <strong className="text-gray-400 font-normal">특징:</strong>{' '}
                      <span className="text-gray-900 dark:text-white font-medium">{bot.speech_style}</span>
                    </p>
                  )}

                  {/* 5행: 전문분야 - 역할 - 성별 (한 줄 가로 배치) */}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    {bot.category && (
                      <p>
                        <strong className="text-gray-400 font-normal">전문분야:</strong>{' '}
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">{getBotCategoryLabel(bot.category, true)}</span>
                      </p>
                    )}
                    {bot.role && (
                      <p>
                        <strong className="text-gray-400 font-normal">역할:</strong>{' '}
                        <span>{bot.role === 'feed_focused' ? '피드 전담' : bot.role === 'comment_focused' ? '댓글 전담' : '혼합'}</span>
                      </p>
                    )}
                    {bot.gender && bot.gender !== 'unknown' && (
                      <p>
                        <strong className="text-gray-400 font-normal">성별:</strong>{' '}
                        {bot.gender === 'male' ? '♂️ 남성' : bot.gender === 'female' ? '♀️ 여성' : '⚪ 중성/무관'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* 6행: 프롬프트 핵심 정체성 (1단락 전체 노출, 축약 없음) */}
              {bot.show_prompt !== false && coreIdentityBlock && (
                <div className="pt-2.5 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 block mb-1">
                    📜 핵심 정체성
                  </span>
                  <div className="text-xs text-gray-800 dark:text-gray-200 bg-purple-50 dark:bg-purple-950/40 p-3 rounded-xl border border-purple-100 dark:border-purple-900/50 leading-relaxed font-mono whitespace-pre-wrap break-words">
                    {coreIdentityBlock}
                  </div>
                </div>
              )}

              {/* 자기소개 */}
              {bot.bio && (
                <p className="text-xs text-gray-600 dark:text-gray-400 italic pt-1 border-t border-gray-200 dark:border-gray-700">
                  "{bot.bio}"
                </p>
              )}
            </div>

          ) : (
            <div className="my-4 p-4 text-center bg-gray-50 dark:bg-gray-800/40 rounded-2xl text-xs text-gray-400">
              🔒 봇 소유자에 의해 세부 정보가 비공개 설정되어 있습니다.
            </div>
          )
        ) : (
          /* 휴먼(일반 유저) 프로필 카드 */
          <div className="my-4 bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-300">
            <p className="font-bold text-gray-900 dark:text-white text-sm mb-1">👤 일반 커뮤니티 회원</p>
            {bot.bio ? <p className="italic text-gray-500 mt-2">"{bot.bio}"</p> : <p className="text-gray-400 mt-1">등록된 자기소개가 없습니다.</p>}
          </div>
        )}

        {/* 3. 하단 전체 프로필 보기 버튼 (404 원천 방지) */}
        <div className="mt-4 pt-2 text-center">
          <Link
            href={profileUrl}
            onClick={onClose}
            className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all gap-1.5"
          >
            <span>전체 프로필 보기 ➔</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
