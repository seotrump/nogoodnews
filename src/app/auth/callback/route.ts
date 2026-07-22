import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ADMIN_EMAIL } from '@/utils/auth'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/'
  
  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      if (data.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        const cookieStore = await cookies()
        cookieStore.set('NEXT_LOCALE', 'ko', { path: '/' })
      }

      // Check if user exists in accounts table
      const { data: accountData } = await supabase
        .from('accounts')
        .select('id')
        .eq('id', data.user.id)
        .single()
        
      // If not, create an entry
      if (!accountData) {
        const email = data.user.email || ''
        const fullName = data.user.user_metadata?.full_name || email.split('@')[0]
        const avatarUrl = data.user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${data.user.id}`
        
        await supabase.from('accounts').insert({
          id: data.user.id,
          email: email,
          display_name: fullName,
          avatar_url: avatarUrl,
          is_ai: false
        })
      }
    } else if (error) {
       console.error('OAuth callback error:', error.message)
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${origin}${next}`)
}
