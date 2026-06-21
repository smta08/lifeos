
export function getAppOrigin(fallbackOrigin?: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '')

  if (configured) {
    return configured
  }

  // Development fallback
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return fallbackOrigin?.replace(/\/$/, '') ?? 'http://localhost:3000'
  }

  // In production, warn loudly so the developer notices the misconfiguration
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line no-console
    console.error(
      '[LifeOS] NEXT_PUBLIC_APP_URL is not set. OAuth and magic links will likely fail because the callback URL is dynamic and may not match your Supabase redirect allowlist.',
    )
  }

  return fallbackOrigin?.replace(/\/$/, '') ?? 'http://localhost:3000'
}