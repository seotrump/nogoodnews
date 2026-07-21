import { Link } from '@/i18n/routing'
import { createClient } from '@/utils/supabase/server'
import { isAdmin } from '@/utils/auth'
import { getUserProfileUrl } from '@/utils/user'
import NotificationBell from '@/components/NotificationBell'
import SearchBar from '@/components/SearchBar'
import { getTranslations } from 'next-intl/server';

export default async function Header() {
  const t = await getTranslations('Header');
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null;
  if (user) {
    const { data } = await supabase.from('accounts').select('display_name, avatar_url').eq('id', user.id).single();
    profile = data;
  }

  const hasAdmin = isAdmin(user)

  return (
    <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-2xl font-black tracking-tighter">
          NoGoodNews<span className="text-red-500">.</span>
        </Link>
        <div className="flex items-center gap-4 flex-1 justify-between ml-4 sm:ml-8">
          <SearchBar />
          
          {user ? (
            <div className="flex items-center gap-2 sm:gap-4 ml-auto">
              <NotificationBell userId={user.id} />
              
              <label htmlFor="mobile-menu" className="sm:hidden p-2 text-gray-600 cursor-pointer hover:bg-gray-100 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </label>
              <input type="checkbox" id="mobile-menu" className="hidden peer" />

              <div className="hidden peer-checked:flex sm:flex flex-col sm:flex-row absolute sm:static top-16 left-0 w-full sm:w-auto bg-white sm:bg-transparent border-b sm:border-none p-4 sm:p-0 gap-3 sm:gap-4 shadow-md sm:shadow-none z-40 items-start sm:items-center text-sm font-medium">
                <Link href={getUserProfileUrl(user)} className="flex items-center gap-2 text-gray-700 font-medium hover:underline w-full sm:w-auto p-2 sm:p-0">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover border" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 border flex items-center justify-center text-xs text-gray-400">?</div>
                  )}
                  <span>{profile?.display_name}</span>
                </Link>

                {hasAdmin && (
                  <Link href="/admin" className="w-full sm:w-auto flex items-center text-gray-700 hover:text-black transition font-medium px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg">
                    {t('botManagement')}
                  </Link>
                )}
                <Link href="/posts/new" className="w-full sm:w-auto flex items-center text-gray-700 hover:text-black transition font-medium px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg">
                  {t('write')}
                </Link>
                <Link href="/settings" className="w-full sm:w-auto flex items-center text-gray-700 hover:text-black transition font-medium px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg">
                  {t('settings')}
                </Link>
                <form action="/auth/signout" method="post" className="w-full sm:w-auto">
                  <button className="w-full sm:w-auto text-left text-gray-700 hover:text-black transition font-medium px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg">
                    {t('logout')}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <Link href="/login" className="bg-gray-800 text-white px-5 py-2 rounded-lg hover:bg-gray-900 transition shadow-sm font-medium ml-auto">
              {t('login')}
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
