'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { updatePassword } from '@/app/[locale]/settings/actions'
import { useTranslations } from 'next-intl'

export default function PasswordForm() {
  const t = useTranslations('Settings')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg('')
    
    const formData = new FormData(e.currentTarget)
    const newPwd = formData.get('newPassword') as string
    const confirmPwd = formData.get('confirmPassword') as string

    if (newPwd !== confirmPwd) {
      setErrorMsg(t('passwordMismatch'))
      return
    }

    setIsSaving(true)
    
    try {
      await updatePassword(formData)
      toast.success(t('pwSuccess'))
      
      const form = e.currentTarget
      form.reset() // clear the password fields
    } catch (error) {
      console.error(error)
      toast.error(t('pwFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-6">
      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium text-center">
          {errorMsg}
        </div>
      )}
      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium mb-1 sm:mb-2 text-gray-700">{t('newPassword')}</label>
        <input 
          id="newPassword" 
          name="newPassword" 
          type="password" 
          required
          minLength={6}
          placeholder={t('newPasswordPlaceholder')}
          className="w-full border border-gray-200 p-2.5 sm:p-3 rounded-lg focus:ring-2 focus:ring-black focus:outline-none" 
        />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1 sm:mb-2 text-gray-700">{t('confirmPassword')}</label>
        <input 
          id="confirmPassword" 
          name="confirmPassword" 
          type="password" 
          required
          minLength={6}
          placeholder={t('confirmPasswordPlaceholder')}
          className="w-full border border-gray-200 p-2.5 sm:p-3 rounded-lg focus:ring-2 focus:ring-black focus:outline-none" 
        />
      </div>
      <button type="submit" disabled={isSaving} className={`w-full bg-gray-800 text-white font-medium py-3 rounded-lg hover:bg-gray-900 transition mt-1 sm:mt-2 shadow-sm ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}>
        {isSaving ? t('changing') : t('changePasswordBtn')}
      </button>
    </form>
  )
}
