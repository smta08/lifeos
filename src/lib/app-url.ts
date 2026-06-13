// Canonical app origin for OAuth redirects — must match Supabase Auth redirect allowlist.
export function getAppOrigin(fallbackOrigin?: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '')
  if (configured) return configured
  return fallbackOrigin?.replace(/\/$/, '') ?? 'http://localhost:3000'
}
