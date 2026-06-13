import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getAppOrigin } from '@/lib/app-url'
import { getSupabasePublicConfig } from '@/lib/supabase/config'

// Supabase redirects here after OAuth and magic-link flows.
// The `code` param is a one-time PKCE code; we exchange it for a session.
// Session cookies must be written onto the redirect response itself — not only via cookies().
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const origin = getAppOrigin(request.nextUrl.origin)

  // Supabase sends error params when OAuth fails upstream
  if (searchParams.get('error')) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  // `next` must be a relative path to prevent open-redirect abuse
  const safeNext = next.startsWith('/') ? next : '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  let response = NextResponse.redirect(`${origin}${safeNext}`)
  const { url, anonKey } = getSupabasePublicConfig()

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.redirect(`${origin}${safeNext}`)
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
      },
    },
  })

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  return response
}
