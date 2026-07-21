'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslations } from 'next-intl'

export default function ForceRunForm({ action }: { action: () => Promise<void> }) {
    const t = useTranslations('Admin')
    const [isPending, setIsPending] = useState(false)

    return (
        <form action={async () => {
            setIsPending(true)
            try {
                await action()
                toast.success(t('feedCreated'))
            } catch (e) {
                toast.error(t('feedFailed'))
            } finally {
                setIsPending(false)
            }
        }}>
            <button
                type="submit"
                disabled={isPending}
                className={`font-medium py-1.5 px-4 text-sm sm:text-base rounded-lg transition ${isPending ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
            >
                {isPending ? t('aiWriting') : t('forceRun')}
            </button>
        </form>
    )
}