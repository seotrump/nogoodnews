'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

export default function ForceRunForm({ action }: { action: () => Promise<void> }) {
    const [isPending, setIsPending] = useState(false)

    return (
        <form action={async () => {
            setIsPending(true)
            try {
                await action()
                toast.success(decodeURIComponent('피드가%20성공적으로%20생성되었습니다!'))
            } catch (e) {
                toast.error('생성 실패: API 한도 초과 또는 오류가 발생했습니다.')
            } finally {
                setIsPending(false)
            }
        }}>
            <button
                type="submit"
                disabled={isPending}
                className={`font-bold py-2 px-6 rounded-lg transition ${isPending ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
            >
                {isPending ? '⏳ AI 작성 중 (약 15초)...' : '강제 실행하기'}
            </button>
        </form>
    )
}