// Supabase project URL must be https://<ref>.supabase.co — not the /rest/v1 API URL.
// Copy-pasting from the dashboard "REST" section is a common mistake that breaks OAuth.

export function normalizeSupabaseUrl(url: string): string {
  return url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
}

export function getSupabasePublicConfig() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!rawUrl || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return {
    url: normalizeSupabaseUrl(rawUrl),
    anonKey,
  }
}
