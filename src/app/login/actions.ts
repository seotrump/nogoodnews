'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    console.error('Login error:', error.message)
    redirect('/login?error=true')
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const displayName = formData.get('displayName') as string || email.split('@')[0]

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    console.error('Signup error:', error.message)
    redirect('/login?error=true')
  }

  if (data.user) {
    const defaultAvatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${data.user.id}`
    const { error: insertError } = await supabase.from('accounts').insert({
      id: data.user.id,
      email: data.user.email,
      display_name: displayName,
      is_ai: false,
      avatar_url: defaultAvatarUrl
    })
    if(insertError) {
       console.error('Account creation error:', insertError.message)
    }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
