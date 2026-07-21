'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createPost(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data: account } = await supabase.from('accounts').select('is_banned').eq('id', user.id).single()
  if (account?.is_banned) {
    throw new Error('Account is banned')
  }

  const headline = formData.get('headline') as string
  const url = formData.get('url') as string
  const content = formData.get('content') as string
  const imageFile = formData.get('imageFile') as File | null

  let imageUrl = undefined

  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split('.').pop()
    const filePath = `${user.id}-${Date.now()}-${Math.random()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('post_images')
      .upload(filePath, imageFile)

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from('post_images')
        .getPublicUrl(filePath)
      imageUrl = publicUrl
    } else {
      console.error('Image upload error:', uploadError)
    }
  }

  const { data, error } = await supabase.from('posts').insert({
    author_id: user.id,
    headline,
    url,
    content,
    image_url: imageUrl
  }).select().single()

  if (error) {
    console.error('Error creating post:', error)
    throw new Error('Failed to create post')
  }

  // Parse hashtags from headline and content
  const extractHashtags = (text: string) => {
    const regex = /#[\w가-힣]+/g
    const matches = text.match(regex)
    return matches ? Array.from(new Set(matches.map(tag => tag.toLowerCase()))) : []
  }

  const tags = Array.from(new Set([...extractHashtags(headline), ...extractHashtags(content)]))

  if (tags.length > 0) {
    // 1. Upsert hashtags (insert or increment count)
    // Unfortunately Supabase JS doesn't support ON CONFLICT easily with increment without RPC.
    // Let's do it individually or with a custom RPC. For simplicity, let's fetch existing, update count, and insert new.
    for (const tag of tags) {
      const { data: existingTag } = await supabase.from('hashtags').select('id, count').eq('name', tag).single()
      let tagId;
      if (existingTag) {
        tagId = existingTag.id
        await supabase.from('hashtags').update({ count: existingTag.count + 1 }).eq('id', tagId)
      } else {
        const { data: newTag } = await supabase.from('hashtags').insert({ name: tag, count: 1 }).select('id').single()
        if (newTag) tagId = newTag.id
      }
      
      // 2. Link to post
      if (tagId) {
        await supabase.from('post_hashtags').insert({ post_id: data.id, hashtag_id: tagId })
      }
    }
  }

  // 중복 호출을 방지하기 위해 봇 알람(fetch) 로직을 완전히 삭제했습니다.
  // 봇 호출은 화면 단(AiTrigger.tsx)에서 알아서 처리합니다.

  revalidatePath('/')
  redirect(`/posts/${data.id}`)
}

export async function updatePost(postId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data: post } = await supabase.from('posts').select('author_id').eq('id', postId).single()
  const { ADMIN_EMAIL } = await import('@/utils/auth')
  const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()

  if (!post || (post.author_id !== user.id && !isAdmin)) {
    throw new Error('Permission denied')
  }

  const headline = formData.get('headline') as string
  const url = formData.get('url') as string
  const content = formData.get('content') as string
  const imageFile = formData.get('imageFile') as File | null

  const updateData: any = { headline, url, content }

  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split('.').pop()
    const filePath = `${user.id}-${Date.now()}-${Math.random()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('post_images')
      .upload(filePath, imageFile)

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from('post_images')
        .getPublicUrl(filePath)
      updateData.image_url = publicUrl
    }
  }

  const { error } = await supabase.from('posts').update(updateData).eq('id', postId)

  if (error) throw new Error('Failed to update post')

  // Re-parse hashtags
  await supabase.from('post_hashtags').delete().eq('post_id', postId)

  const extractHashtags = (text: string) => {
    const regex = /#[\w가-힣]+/g
    const matches = text.match(regex)
    return matches ? Array.from(new Set(matches.map(tag => tag.toLowerCase()))) : []
  }

  const tags = Array.from(new Set([...extractHashtags(headline), ...extractHashtags(content)]))

  if (tags.length > 0) {
    for (const tag of tags) {
      const { data: existingTag } = await supabase.from('hashtags').select('id, count').eq('name', tag).single()
      let tagId;
      if (existingTag) {
        tagId = existingTag.id
        await supabase.from('hashtags').update({ count: existingTag.count + 1 }).eq('id', tagId)
      } else {
        const { data: newTag } = await supabase.from('hashtags').insert({ name: tag, count: 1 }).select('id').single()
        if (newTag) tagId = newTag.id
      }
      
      if (tagId) {
        await supabase.from('post_hashtags').insert({ post_id: postId, hashtag_id: tagId })
      }
    }
  }

  revalidatePath('/')
  revalidatePath(`/posts/${postId}`)
  redirect(`/posts/${postId}`)
}

export async function addComment(formData: FormData, postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data: account } = await supabase.from('accounts').select('is_banned').eq('id', user.id).single()
  if (account?.is_banned) {
    throw new Error('Account is banned')
  }

  const content = formData.get('content') as string
  const imageUrl = formData.get('image_url') as string | null

  const { error } = await supabase.from('comments').insert({
    post_id: postId,
    author_id: user.id,
    content,
    image_url: imageUrl
  })

  if (error) {
    console.error('Error adding comment:', error)
    throw new Error('Failed to add comment')
  }

  // 멘션 감지 및 비동기 AI 답변 트리거
  const mentionMatch = content.match(/@([a-zA-Z0-9_]+)/);
  if (mentionMatch) {
    const mentionedUsername = mentionMatch[1];
    
    // 멘션된 계정이 AI인지 확인
    const { data: mentionedAccount } = await supabase
      .from('accounts')
      .select('id, is_ai')
      .eq('username', mentionedUsername)
      .single()

    if (mentionedAccount && mentionedAccount.is_ai) {
      // Get current locale dynamically
      const { getLocale } = await import('next-intl/server')
      const locale = await getLocale()

      // 비동기로 AI 답변 생성 API 호출 (await 하지 않음)
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      fetch(`${baseUrl}/api/ai-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          postId, 
          userComment: content,
          botId: mentionedAccount.id,
          locale
        })
      }).catch(err => console.error('AI Reply Trigger Error:', err))
    }
  }

  revalidatePath(`/posts/${postId}`)
}

export async function deleteComment(commentId: string, postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // 본인 댓글이거나 관리자인 경우만 삭제 허용
  const { data: comment } = await supabase
    .from('comments')
    .select('author_id')
    .eq('id', commentId)
    .single()

  const { ADMIN_EMAIL } = await import('@/utils/auth')
  const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()

  if (!comment || (comment.author_id !== user.id && !isAdmin)) {
    throw new Error('Permission denied')
  }

  const { error } = await supabase.from('comments').delete().eq('id', commentId)
  if (error) throw new Error('Failed to delete comment')

  revalidatePath(`/posts/${postId}`)
}

import { GoogleGenerativeAI } from '@google/generative-ai'

export async function translateText(text: string, targetLocale: string) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is missing')
  }
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
  const model = genAI.getGenerativeModel({ model: "gemma-4-26b-a4b-it" })

  const langName = targetLocale === 'ko' ? 'Korean' : 'English'
  const prompt = `Translate the following text to ${langName}. Preserve any hashtags (#tag) exactly as they are. Output ONLY the translated text without any quotes or explanations.\n\nText:\n${text}`
  
  try {
    const result = await model.generateContent(prompt)
    return result.response.text().trim()
  } catch (error) {
    console.error('Translation error:', error)
    throw new Error('Translation failed')
  }
}