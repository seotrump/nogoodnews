import { Link } from '@/i18n/routing'
import { createClient } from '@/utils/supabase/server'
import { isAdmin } from '@/utils/auth'
import NotificationBell from '@/components/NotificationBell'
import SearchBar from '@/components/SearchBar'
import HeaderControls from '@/components/HeaderControls'
import { getTranslations, getLocale } from 'next-intl/server';

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
  const { data: settings } = await supabase.from('site_settings').select('logo_url').eq('id', 'global').single()
  const siteLogo = settings?.logo_url

  const locale = await getLocale();
  const homeUrl = locale === 'en' ? '/' : `/${locale}`;

  return (
    <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href={homeUrl} className="text-2xl font-black tracking-tighter shrink-0 flex items-center h-full py-3">
            {siteLogo ? (
              <img src={siteLogo} alt="Site Logo" className="h-full max-h-10 w-auto object-contain" />
            ) : (
              <>NoGoodNews<span className="text-red-500">.</span></>
            )}
          </a>

          {/* [추가됨] 언어 전환 버튼 (KO / EN) */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            <Link
              href="/"
              locale="ko"
              className={`text-xs font-bold px-2 py-1 rounded transition ${locale === 'ko' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              KO
            </Link>
            <Link
              href="/"
              locale="en"
              className={`text-xs font-bold px-2 py-1 rounded transition ${locale === 'en' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              EN
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-1 justify-between ml-4 sm:ml-8">
          <HeaderControls
            user={user}
            profile={profile}
            hasAdmin={hasAdmin}
            t={{
              botManagement: t('botManagement'),
              userManagement: t('userManagement'),
              write: t('write'),
              settings: t('settings'),
              account: t('account'),
              logout: t('logout'),
              login: t('login')
            }}
          />
        </div>
      </div>
    </header>
  )
}