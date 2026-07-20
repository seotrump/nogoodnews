'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { updatePassword } from '@/app/[locale]/settings/actions'
import { useTranslations } from 'next-intl'

export default function PasswordForm() {
  const t = useTranslations('Settings')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    
    try {
      const formData = new FormData(e.currentTarget)
      await updatePassword(formData)
      toast.success(t('pwSuccess'))
      
      const form = e.currentTarget
      form.reset() // clear the password field
    } catch (error) {
      console.error(error)
      toast.error(t('pwFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <label htmlFor="newPassword" className="block text-sm font-semibold mb-2 text-gray-700">{t('newPassword')}</label>
        <input 
          id="newPassword" 
          name="newPassword" 
          type="password" 
          required
          minLength={6}
          placeholder={t('newPasswordPlaceholder')}
          className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black outline-none" 
        />
      </div>
      <button type="submit" disabled={isSaving} className={`w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-black transition ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}>
        {isSaving ? t('changing') : t('changePasswordBtn')}
      </button>
    </form>
  )
}
