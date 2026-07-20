'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { updateProfile } from '@/app/[locale]/settings/actions'
import AvatarUpload from './AvatarUpload'

export default function SettingsForm({ profile, user }: { profile: any, user: any }) {
  const [isSaving, setIsSaving] = useState(false)
  const [coverPreview, setCoverPreview] = useState<string | null>(profile?.cover_url || null)

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const url = URL.createObjectURL(file)
      setCoverPreview(url)
    }
  }

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
        <label className="block text-sm font-semibold mb-2 text-gray-700">배경 이미지 (Cover)</label>
        <div className="relative w-full h-32 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden group">
          {coverPreview && <img src={coverPreview} alt="Cover" className="absolute inset-0 w-full h-full object-cover object-center opacity-80 group-hover:opacity-40 transition" />}
          <div className="relative z-10 text-center pointer-events-none">
            <span className="bg-white px-3 py-1 rounded-full shadow-sm text-sm font-bold text-gray-700">
              {coverPreview ? '이미지 변경하기' : '클릭하여 이미지 선택'}
            </span>
          </div>
          <input type="file" name="coverFile" accept="image/*" onChange={handleCoverChange} className="absolute inset-0 opacity-0 cursor-pointer z-20 w-full h-full" />
        </div>
        <p className="text-xs text-gray-500 mt-2">가로로 넓은 이미지를 권장합니다. (이미지는 중앙을 기준으로 자동 크롭됩니다)</p>
      </div>

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
