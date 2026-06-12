// Service-role Supabase client. Use ONLY in webhook handlers and Inngest functions.
// Never import in user query paths — this client bypasses RLS.
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

export function createAdminClient() {
  return createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
  )
}
