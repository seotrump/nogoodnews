import { Link } from '@/i18n/routing'
import { createClient } from '@/utils/supabase/server'
import { isAdmin } from '@/utils/auth'
import { getUserProfileUrl } from '@/utils/user'
import NotificationBell from '@/components/NotificationBell'
import SearchBar from '@/components/SearchBar'
import HeaderControls from '@/components/HeaderControls'
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
  const { data: settings } = await supabase.from('site_settings').select('logo_url').eq('id', 'global').single()
  const siteLogo = settings?.logo_url

  return (
    <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-2xl font-black tracking-tighter shrink-0 flex items-center h-full py-3">
          {siteLogo ? (
            <img src={siteLogo} alt="Site Logo" className="h-full max-h-10 w-auto object-contain" />
          ) : (
            <>NoGoodNews<span className="text-red-500">.</span></>
          )}
        </Link>
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
              logout: t('logout'),
              login: t('login')
            }} 
          />
        </div>
      </div>
    </header>
  )
}
