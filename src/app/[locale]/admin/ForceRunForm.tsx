'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslations } from 'next-intl'

export default function ForceRunForm({ actionPro, actionLite, pendingCount = 0 }: { actionPro: () => Promise<{ error?: string, success?: boolean } | void>, actionLite: () => Promise<{ error?: string, success?: boolean } | void>, pendingCount?: number }) {
    const t = useTranslations('Admin')
    const [pendingType, setPendingType] = useState<'pro' | 'lite' | null>(null)
    const [isEmbedding, setIsEmbedding] = useState(false)

    const handleAction = async (type: 'pro' | 'lite', action: () => Promise<{ error?: string, success?: boolean } | void>) => {
        setPendingType(type)
        try {
            const res = await action()
            if (res && res.error) {
                toast.error(res.error)
            } else {
                toast.success(t('feedCreated'))
            }
        } catch (e: any) {
            toast.error(e.message || t('feedFailed'))
        } finally {
            setPendingType(null)
        }
    }

    const handleUpdateEmbeddings = async () => {
        setIsEmbedding(true)
        try {
            const res = await fetch('/api/update-bot-embeddings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || '임베딩 생성 실패')
            } else if (data.updated === 0) {
                toast.success('모든 봇의 임베딩이 최신 상태입니다.')
            } else {
                toast.success(`✅ ${data.updated}개 봇 임베딩 생성 완료!`)
            }
        } catch (e: any) {
            toast.error(e.message || '임베딩 생성 중 오류')
        } finally {
            setIsEmbedding(false)
        }
    }

    return (
        <div className="flex gap-2 items-center flex-wrap">
            <button
                type="button"
                onClick={() => handleAction('lite', actionLite)}
                disabled={pendingType !== null}
                className={`w-fit font-bold py-2.5 px-3.5 text-xs sm:text-sm rounded-xl shadow-sm transition ${pendingType === 'lite' ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-gray-600 hover:bg-gray-700 text-white'
                    }`}
            >
                {pendingType === 'lite' ? '작성 중...' : '라이트 강제피드'}
            </button>
            <button
                type="button"
                onClick={() => handleAction('pro', actionPro)}
                disabled={pendingType !== null}
                className={`w-fit font-bold py-2.5 px-3.5 text-xs sm:text-sm rounded-xl shadow-sm transition ${pendingType === 'pro' ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-blue-900 hover:bg-blue-950 text-white'
                    }`}
            >
                {pendingType === 'pro' ? '작성 중...' : '프로 강제피드'}
            </button>
            <button
                type="button"
                onClick={handleUpdateEmbeddings}
                disabled={isEmbedding}
                className={`w-fit font-bold py-2.5 px-3.5 text-xs sm:text-sm rounded-xl shadow-sm transition ${isEmbedding ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-purple-700 hover:bg-purple-800 text-white'}`}
            >
                {isEmbedding ? '임베딩 생성 중...' : '🧠 봇 임베딩 갱신'}
            </button>
        </div>
    )
}