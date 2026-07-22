'use client'

import { usePathname } from 'next/navigation'
import { Link } from '@/i18n/routing'
import SearchBar from '@/components/SearchBar'
import NotificationBell from '@/components/NotificationBell'

export default function HeaderControls({ user, profile, hasAdmin, t }: { user: any, profile: any, hasAdmin: boolean, t: any }) {
  const pathname = usePathname()
  
  // If on admin, settings, or write/edit pages, hide search and profile avatar/name
  const isHiddenPage = pathname.includes('/admin') || 
                       pathname.includes('/settings') || 
                       pathname.includes('/posts/new') || 
                       pathname.includes('/edit')

  const closeMenu = () => {
    const cb = document.getElementById('mobile-menu') as HTMLInputElement
    if (cb) cb.checked = false
  }

  return (
    <>
      {!isHiddenPage ? <SearchBar /> : <div className="flex-1" />}
      
      {user ? (
        <div className="flex items-center gap-2 sm:gap-4 ml-auto">
          <NotificationBell userId={user.id} />
          
          <label htmlFor="mobile-menu" className="sm:hidden p-2 text-gray-600 cursor-pointer hover:bg-gray-100 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </label>
          <input type="checkbox" id="mobile-menu" className="hidden peer" />

          <div className="hidden peer-checked:flex sm:flex flex-col sm:flex-row absolute sm:static top-16 left-0 w-full sm:w-auto bg-white sm:bg-transparent border-b sm:border-none p-4 sm:p-0 gap-3 sm:gap-4 shadow-md sm:shadow-none z-40 items-start sm:items-center text-sm font-medium">
            <Link onClick={closeMenu} href={`/users/${user.id}`} className="flex items-center gap-2 text-gray-700 font-medium hover:underline w-full sm:w-auto p-2 sm:p-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover border" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 border flex items-center justify-center text-xs text-gray-400">?</div>
              )}
              <span>{profile?.display_name}</span>
            </Link>

            {hasAdmin && (
              <>
                <Link onClick={closeMenu} href="/admin/users" className={`w-full sm:w-auto flex items-center transition font-medium px-3 py-2 rounded-lg ${pathname === '/admin/users' || pathname === '/ko/admin/users' ? 'bg-gray-200 text-black' : 'text-gray-700 hover:text-black bg-gray-100 hover:bg-gray-200'}`}>
                  {t.userManagement}
                </Link>
                <Link onClick={closeMenu} href="/admin" className={`w-full sm:w-auto flex items-center transition font-medium px-3 py-2 rounded-lg ${pathname === '/admin' || pathname === '/ko/admin' ? 'bg-gray-200 text-black' : 'text-gray-700 hover:text-black bg-gray-100 hover:bg-gray-200'}`}>
                  {t.botManagement}
                </Link>
              </>
            )}
            <Link onClick={closeMenu} href="/posts/new" className="w-full sm:w-auto flex items-center text-gray-700 hover:text-black transition font-medium px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg">
              {t.write}
            </Link>
            <Link onClick={closeMenu} href="/settings" className="w-full sm:w-auto flex items-center text-gray-700 hover:text-black transition font-medium px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg">
              {t.settings}
            </Link>
            <div className="w-full sm:w-auto">
              <button 
                onClick={async () => {
                  closeMenu();
                  const { createClient } = await import('@/utils/supabase/client');
                  const supabase = createClient();
                  await supabase.auth.signOut();
                  window.location.href = '/';
                }}
                className="w-full sm:w-auto text-left text-gray-700 hover:text-black transition font-medium px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                {t.logout}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <Link href="/login" className="bg-gray-800 text-white px-5 py-2 rounded-lg hover:bg-gray-900 transition shadow-sm font-medium ml-auto">
          {t.login}
        </Link>
      )}
    </>
  )
}
