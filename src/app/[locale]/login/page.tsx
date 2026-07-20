import { login, signup } from './actions'
import { getTranslations } from 'next-intl/server'

export default async function LoginPage() {
  const t = await getTranslations('Login')

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <form className="p-8 bg-white shadow-md rounded-lg flex flex-col gap-4 w-96">
        <h1 className="text-2xl font-bold mb-4 text-center">{t('title')}</h1>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-semibold">{t('email')}</label>
          <input id="email" name="email" type="email" required className="border p-2 rounded" placeholder={t('emailPlaceholder')} />
        </div>
        <div className="flex flex-col gap-2 mb-2">
          <label htmlFor="password" className="text-sm font-semibold">{t('password')}</label>
          <input id="password" name="password" type="password" required className="border p-2 rounded" placeholder={t('passwordPlaceholder')} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="displayName" className="text-sm font-semibold">{t('displayName')}</label>
          <input id="displayName" name="displayName" type="text" className="border p-2 rounded" placeholder={t('displayNamePlaceholder')} />
        </div>
        <div className="flex gap-4 mt-4">
          <button formAction={login} className="flex-1 bg-black text-white p-2 rounded hover:bg-gray-800 transition">{t('loginBtn')}</button>
          <button formAction={signup} className="flex-1 bg-gray-200 text-black p-2 rounded hover:bg-gray-300 transition">{t('signupBtn')}</button>
        </div>
      </form>
    </div>
  )
}
