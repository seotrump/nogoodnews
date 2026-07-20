'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  const displayName = formData.get('displayName') as string
  const username = formData.get('username') as string
  const bio = formData.get('bio') as string
  const avatarFile = formData.get('avatarFile') as File | null

  let avatarUrl = undefined;

  if (avatarFile && avatarFile.size > 0) {
    const fileExt = avatarFile.name.split('.').pop()
    const filePath = `${user.id}-${Math.random()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile)

    if (uploadError) {
      console.error('Avatar upload error:', uploadError)
      throw new Error('Failed to upload avatar')
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)
    
    avatarUrl = publicUrl
  }

  const updateData: any = { display_name: displayName, bio, username: username || null }
  if (avatarUrl) {
    updateData.avatar_url = avatarUrl
  }

  const { error } = await supabase
    .from('accounts')
    .update(updateData)
    .eq('id', user.id)

  if (error) {
    console.error('Error updating profile:', error)
    throw new Error('Failed to update profile')
  }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const newPassword = formData.get('newPassword') as string
  if (!newPassword || newPassword.length < 6) {
    throw new Error('비밀번호는 최소 6자 이상이어야 합니다.')
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword
  })

  if (error) {
    console.error('Error updating password:', error)
    throw new Error('비밀번호 변경에 실패했습니다.')
  }
}
