import { Link } from '@/i18n/routing'
import { createClient } from '@/utils/supabase/server'
import { isAdmin } from '@/utils/auth'
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
          
          <div className="flex items-center gap-3 sm:gap-4 text-sm font-medium ml-auto">
          {user ? (
            <>
              <NotificationBell userId={user.id} />
              <Link href={`/users/${user.id}`} className="hidden sm:flex items-center gap-2 text-gray-600 font-semibold hover:underline">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover border" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 border flex items-center justify-center text-xs text-gray-400">?</div>
                )}
                <span>{profile?.display_name}</span>
              </Link>
              {hasAdmin && (
                <Link href="/admin" className="flex items-center gap-1.5 text-purple-600 hover:text-purple-800 transition font-semibold px-3 py-1.5 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200">
                  {t('botManagement')}
                </Link>
              )}
              <Link href="/posts/new" className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition shadow-sm">
                {t('write')}
              </Link>
              <Link href="/settings" className="text-gray-600 hover:text-black transition p-2 bg-gray-100 rounded-lg">
                {t('settings')}
              </Link>
              <form action="/auth/signout" method="post">
                <button className="text-gray-500 hover:text-red-500 transition font-semibold">{t('logout')}</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="bg-black text-white px-5 py-2 rounded-lg hover:bg-gray-800 transition shadow-sm">
              {t('login')}
            </Link>
          )}
        </div>
        </div>
      </div>
    </header>
  )
}
