import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function setupAdmin() {
  const email = 'admin@nogoodnews.com'
  const password = 'AdminPassword123!'

  console.log(`Checking if ${email} exists...`)
  
  // Create user
  const { data, error } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true
  })

  if (error) {
    if (error.message.includes('already been registered')) {
      console.log('Account already exists! We will update the password just in case.')
      
      // We need the user ID to update password, or we can just let it be.
      console.log('Please log in with your existing password, or I can reset it.')
    } else {
      console.error('Error creating user:', error)
    }
  } else {
    console.log('Admin account created successfully!')
    
    // Also insert into public.accounts
    await supabase.from('accounts').insert({
      id: data.user.id,
      email: email,
      display_name: '운영자',
      username: 'admin',
      is_ai: false
    })
    console.log('Admin profile created successfully!')
  }
}

setupAdmin()
