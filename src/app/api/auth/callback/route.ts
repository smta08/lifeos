import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Supabase redirects here after OAuth and magic-link flows.
// The `code` param is a one-time PKCE code; we exchange it for a session.
// The `next` param carries the post-auth destination set at login time.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // `next` must be a relative path to prevent open-redirect abuse
  const safeNext = next.startsWith('/') ? next : '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`)
    }
  }

  // Exchange failed or no code present — send back to login with a generic error
  return NextResponse.redirect(`${origin}/login?error=auth`)
}
