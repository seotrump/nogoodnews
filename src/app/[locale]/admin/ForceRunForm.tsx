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
                className={`w-fit font-bold py-2.5 px-6 text-sm sm:text-base rounded-xl shadow-sm transition ${isPending ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-blue-900 hover:bg-blue-950 text-white'
                    }`}
            >
                {isPending ? t('aiWriting') : t('manualFeed')}
            </button>
        </form>
    )
}