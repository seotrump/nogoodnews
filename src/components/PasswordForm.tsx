'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { updatePassword } from '@/app/settings/actions'

export default function PasswordForm() {
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    
    try {
      const formData = new FormData(e.currentTarget)
      await updatePassword(formData)
      toast.success('비밀번호가 성공적으로 변경되었습니다.')
      
      const form = e.currentTarget
      form.reset() // clear the password field
    } catch (error) {
      console.error(error)
      toast.error('비밀번호 변경에 실패했습니다. (최소 6자 이상)')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <label htmlFor="newPassword" className="block text-sm font-semibold mb-2 text-gray-700">새 비밀번호</label>
        <input 
          id="newPassword" 
          name="newPassword" 
          type="password" 
          required
          minLength={6}
          placeholder="새로운 비밀번호를 입력하세요"
          className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black outline-none" 
        />
      </div>
      <button type="submit" disabled={isSaving} className={`w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-black transition ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}>
        {isSaving ? '변경 중...' : '비밀번호 변경하기'}
      </button>
    </form>
  )
}
