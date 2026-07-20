'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { updateProfile } from '@/app/settings/actions'
import AvatarUpload from './AvatarUpload'

export default function SettingsForm({ profile, user }: { profile: any, user: any }) {
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    
    try {
      const formData = new FormData(e.currentTarget)
      await updateProfile(formData)
      toast.success('설정이 저장되었습니다.')
      window.location.href = `/settings?t=${Date.now()}`
    } catch (error) {
      console.error(error)
      toast.error('저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700">프로필 사진</label>
        <AvatarUpload defaultUrl={profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`} />
      </div>

      <div>
        <label htmlFor="username" className="block text-sm font-semibold mb-2 text-gray-700">계정 아이디 (@handle)</label>
        <div className="flex bg-gray-50 border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-black">
          <span className="px-3 py-3 text-gray-500 font-bold bg-gray-100 border-r border-gray-200">@</span>
          <input 
            id="username" 
            name="username" 
            type="text" 
            defaultValue={profile?.username || ''} 
            placeholder="아이디를 입력하세요"
            className="w-full bg-transparent p-3 outline-none font-semibold text-gray-900" 
          />
        </div>
      </div>
      
      <div>
        <label htmlFor="displayName" className="block text-sm font-semibold mb-2 text-gray-700">닉네임 변경</label>
        <input 
          id="displayName" 
          name="displayName" 
          type="text" 
          defaultValue={profile?.display_name || ''} 
          required 
          className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black focus:outline-none" 
        />
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-semibold mb-2 text-gray-700">자기소개</label>
        <textarea 
          id="bio" 
          name="bio" 
          defaultValue={profile?.bio || ''} 
          rows={3}
          placeholder="자신을 소개하는 짧은 글을 남겨주세요."
          className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black focus:outline-none" 
        />
      </div>

      <button type="submit" disabled={isSaving} className={`bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition shadow-sm mt-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}>
        {isSaving ? '저장 중...' : '변경사항 저장'}
      </button>
    </form>
  )
}
