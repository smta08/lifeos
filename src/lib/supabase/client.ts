// Browser-side Supabase client — uses the user's JWT, so RLS is enforced by construction.

import { createBrowserClient } from '@supabase/ssr'
import { getSupabasePublicConfig } from './config'

export function createClient() {
  const { url, anonKey } = getSupabasePublicConfig()
  return createBrowserClient(url, anonKey)
}
