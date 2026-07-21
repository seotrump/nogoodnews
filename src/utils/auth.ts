import { User } from '@supabase/supabase-js'

export const ADMIN_EMAIL = 'anbtiteam@gmail.com'

export function isAdmin(user: User | null | undefined): boolean {
  if (!user || !user.email) return false
  return user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
}
