// Call as the first line of every Server Action.
// getUser() validates the JWT with Supabase's auth server — never trust getSession() alone.

import type { User } from '@supabase/supabase-js'
import { AppError } from '@/lib/errors'
import { createClient } from '@/lib/supabase/server'

export async function requireUser(): Promise<User> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new AppError('UNAUTHORIZED', 'Authentication required')
  }

  return user
}
