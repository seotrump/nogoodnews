'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslations } from 'next-intl'

export default function ForceRunForm({ actionPro, actionLite }: { actionPro: () => Promise<any>, actionLite: () => Promise<any> }) {
    const t = useTranslations('Admin')
    const [pendingType, setPendingType] = useState<'pro' | 'lite' | null>(null)

    const handleAction = async (type: 'pro' | 'lite', action: () => Promise<any>) => {
        setPendingType(type)
        try {
            const result = await action()
            if (result && result.success === false) {
                toast.error(result.message)
            } else if (result && result.success === true) {
                toast.success(result.message)
            } else {
                toast.success(t('feedCreated'))
            }
        } catch (e: any) {
            toast.error(t('feedFailed'))
        } finally {
            setPendingType(null)
        }
    }

    return (
        <div className="flex gap-2">
            <button
                type="button"
                onClick={() => handleAction('lite', actionLite)}
                disabled={pendingType !== null}
                className={`w-fit font-bold py-2.5 px-4 text-sm sm:text-base rounded-xl shadow-sm transition ${pendingType === 'lite' ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-gray-600 hover:bg-gray-700 text-white'
                    }`}
            >
                {pendingType === 'lite' ? t('aiWriting') : t('manualFeedLite')}
            </button>
            <button
                type="button"
                onClick={() => handleAction('pro', actionPro)}
                disabled={pendingType !== null}
                className={`w-fit font-bold py-2.5 px-4 text-sm sm:text-base rounded-xl shadow-sm transition ${pendingType === 'pro' ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-blue-900 hover:bg-blue-950 text-white'
                    }`}
            >
                {pendingType === 'pro' ? t('aiWriting') : t('manualFeedPro')}
            </button>
        </div>
    )
}