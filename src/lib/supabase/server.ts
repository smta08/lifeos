// Server-side Supabase client — reads the user's JWT from cookies so RLS is enforced.
// Use in Server Components, Server Actions, and Route Handlers.
// Always call getUser(), never getSession() alone, for auth decisions.

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabasePublicConfig } from './config'

export async function createClient() {
  const cookieStore = await cookies()
  const { url, anonKey } = getSupabasePublicConfig()

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component — cookies are read-only there.
            // The middleware handles session refresh so this is safe to ignore.
          }
        },
      },
    },
  )
}
