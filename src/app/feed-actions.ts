'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { isAdmin } from '@/utils/auth'

function getSupabaseAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function deletePost(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!isAdmin(user)) {
    throw new Error('Not authorized to delete posts')
  }

  const supabaseAdmin = getSupabaseAdmin()

  // First, delete all comments associated with the post
  const { error: commentError } = await supabaseAdmin
    .from('comments')
    .delete()
    .eq('post_id', postId)

  if (commentError) {
    console.error('Failed to delete comments:', commentError)
    throw new Error('Failed to delete comments')
  }

  // Then, delete the post
  const { error: postError } = await supabaseAdmin
    .from('posts')
    .delete()
    .eq('id', postId)

  if (postError) {
    console.error('Failed to delete post:', postError)
    throw new Error('Failed to delete post')
  }

  revalidatePath('/', 'layout')
}

export async function deleteMultiplePosts(postIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!isAdmin(user)) {
    throw new Error('Not authorized to delete posts')
  }

  if (!postIds || postIds.length === 0) return

  const supabaseAdmin = getSupabaseAdmin()

  // First, delete all comments associated with these posts
  const { error: commentError } = await supabaseAdmin
    .from('comments')
    .delete()
    .in('post_id', postIds)

  if (commentError) {
    console.error('Failed to delete comments:', commentError)
    throw new Error('Failed to delete comments')
  }

  // Then, delete the posts
  const { error: postError } = await supabaseAdmin
    .from('posts')
    .delete()
    .in('id', postIds)

  if (postError) {
    console.error('Failed to delete posts:', postError)
    throw new Error('Failed to delete posts')
  }

  revalidatePath('/', 'layout')
}
