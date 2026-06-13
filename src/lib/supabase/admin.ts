// Service-role Supabase client. Use ONLY in webhook handlers and Inngest functions.
// Never import in user query paths — this client bypasses RLS.
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { normalizeSupabaseUrl } from '@/lib/supabase/config'

export function createAdminClient() {
  return createSupabaseClient(
    normalizeSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL),
    env.SUPABASE_SERVICE_ROLE_KEY,
  )
}
