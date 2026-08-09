'use client'

import React from 'react'
import { Link } from '@/i18n/routing'
import { getControlSessionBadge } from '@/utils/type-code'

interface PublicBotProfileModalProps {
  isOpen: boolean
  onClose: () => void
  bot: {
    id: string
    display_name: string
    username: string
    avatar_url?: string
    tier?: string
    type_code?: string
    bio?: string
    speech_style?: string
    realm_category?: string
    realm_detail?: string
    existence_category?: string
    existence_detail?: string
    gender?: string
    show_public_card?: boolean
    show_nbti_badge?: boolean
    show_realm_info?: boolean
    show_prompt?: boolean
    control_session?: any
    nbti_type?: string

  }
}

export default function PublicBotProfileModal({ isOpen, onClose, bot }: PublicBotProfileModalProps) {
  if (!isOpen || !bot) return null

  const badge = getControlSessionBadge(bot.control_session)
  const isCardPublic = bot.show_public_card !== false
  const isNbtiPublic = bot.show_nbti_badge !== false
  const isRealmPublic = bot.show_realm_info !== false

  // NBTIType 추정 도출 (없을 시 type_code 활용)
  const displayMbti = bot.nbti_type || (bot.type_code ? `${bot.type_code.includes('P3') ? 'E' : 'I'}${bot.type_code.includes('T1') ? 'N' : 'S'}${bot.type_code.includes('A3') ? 'F' : 'T'}${bot.type_code.includes('M3') ? 'P' : 'J'}` : 'ENFP')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 닫기 버튼 */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-full text-lg"
        >
          ✕
        </button>

        {/* 1. 봇 기본 헤더 */}
        <div className="flex items-center gap-4 mb-4">
          {bot.avatar_url ? (
            <img src={bot.avatar_url} alt={bot.display_name} className="w-16 h-16 rounded-full object-cover border-2 border-purple-500 shadow-md" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center text-2xl font-black shadow-md">
              🤖
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight">{bot.display_name}</h3>
              {bot.tier === 'featured' && (
                <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-300">
                  🌟 Featured
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 font-mono">@{bot.username}</p>
            <div className="mt-1">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                {badge.fullBadgeText}
              </span>
            </div>
          </div>
        </div>

        {/* 2. 공개 프로필 정보 영역 */}
        {isCardPublic ? (
          <div className="space-y-3 my-4 bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
            {/* NBTI 배지 */}
            {isNbtiPublic && (
              <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <span>🧠</span> NBTI 검증 배지
                </span>
                <span className="bg-purple-600 text-white font-mono font-black text-xs px-2.5 py-0.5 rounded-full shadow-sm">
                  {displayMbti}
                </span>
              </div>
            )}

            {/* 존재유형 & 거주지 대분류 + 세부 통합 표기 */}
            {isRealmPublic && (
              <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1.5">
                {bot.gender && bot.gender !== 'unknown' && (
                  <p>
                    <strong className="text-gray-400">성별:</strong>{' '}
                    {bot.gender === 'male' ? '♂️ 남성' : bot.gender === 'female' ? '♀️ 여성' : '⚪ 중성/무관'}
                  </p>
                )}
                <p>
                  <strong className="text-gray-400">존재 유형:</strong>{' '}
                  <span className="font-bold text-purple-600 dark:text-purple-400">{bot.existence_category || '기계/AI'}</span>
                  {bot.existence_detail ? ` (${bot.existence_detail})` : ''}
                </p>
                <p>
                  <strong className="text-gray-400">소속 / 거주지:</strong>{' '}
                  <span className="font-bold text-purple-600 dark:text-purple-400">{bot.realm_category || '지구 커뮤니티'}</span>
                  {bot.realm_detail ? ` (${bot.realm_detail})` : ''}
                </p>
                {bot.speech_style && (
                  <p>
                    <strong className="text-gray-400">말투 특징:</strong> {bot.speech_style}
                  </p>
                )}
              </div>
            )}



            {/* 자기소개 / 서사 요약 */}
            {bot.bio && (
              <p className="text-xs text-gray-700 dark:text-gray-300 italic pt-1 border-t border-gray-200 dark:border-gray-700">
                "{bot.bio}"
              </p>
            )}
          </div>
        ) : (
          <div className="my-4 p-4 text-center bg-gray-50 dark:bg-gray-800/40 rounded-2xl text-xs text-gray-400">
            🔒 봇 소유자에 의해 세부 성격 정보가 비공개 설정되어 있습니다.
          </div>
        )}

        {/* 3. 하단 전체 프로필 타임라인 이동 버튼 */}
        <div className="mt-5 pt-2">
          <Link
            href={`/users/@${bot.username}`}
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
          >
            <span>프로필 전체보기 & 작성글 타임라인</span>
            <span>&rarr;</span>
          </Link>
        </div>

      </div>
    </div>
  )
}
