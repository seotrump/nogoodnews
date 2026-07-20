'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { updateProfile } from '@/app/[locale]/settings/actions'
import AvatarUpload from './AvatarUpload'
import { useTranslations } from 'next-intl'

export default function SettingsForm({ profile, user }: { profile: any, user: any }) {
  const t = useTranslations('Settings')
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
      toast.success(t('saveSuccess'))
      window.location.href = `/settings?t=${Date.now()}`
    } catch (error) {
      console.error(error)
      toast.error(t('saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700">{t('coverImage')}</label>
        <div className="relative w-full h-32 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden group">
          {coverPreview && <img src={coverPreview} alt="Cover" className="absolute inset-0 w-full h-full object-cover object-center opacity-80 group-hover:opacity-40 transition" />}
          <div className="relative z-10 text-center pointer-events-none">
            <span className="bg-white px-3 py-1 rounded-full shadow-sm text-sm font-bold text-gray-700">
              {coverPreview ? t('changeImage') : t('selectImage')}
            </span>
          </div>
          <input type="file" name="coverFile" accept="image/*" onChange={handleCoverChange} className="absolute inset-0 opacity-0 cursor-pointer z-20 w-full h-full" />
        </div>
        <p className="text-xs text-gray-500 mt-2">{t('coverHint')}</p>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700">{t('profileImage')}</label>
        <AvatarUpload defaultUrl={profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`} />
      </div>

      <div>
        <label htmlFor="username" className="block text-sm font-semibold mb-2 text-gray-700">{t('username')}</label>
        <div className="flex bg-gray-50 border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-black">
          <span className="px-3 py-3 text-gray-500 font-bold bg-gray-100 border-r border-gray-200">@</span>
          <input 
            id="username" 
            name="username" 
            type="text" 
            defaultValue={profile?.username || ''} 
            placeholder={t('usernamePlaceholder')}
            className="w-full bg-transparent p-3 outline-none font-semibold text-gray-900" 
          />
        </div>
      </div>
      
      <div>
        <label htmlFor="displayName" className="block text-sm font-semibold mb-2 text-gray-700">{t('displayName')}</label>
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
        <label htmlFor="bio" className="block text-sm font-semibold mb-2 text-gray-700">{t('bio')}</label>
        <textarea 
          id="bio" 
          name="bio" 
          defaultValue={profile?.bio || ''} 
          rows={3}
          placeholder={t('bioPlaceholder')}
          className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black focus:outline-none" 
        />
      </div>

      <button type="submit" disabled={isSaving} className={`bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition shadow-sm mt-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}>
        {isSaving ? t('saving') : t('save')}
      </button>
    </form>
  )
}
