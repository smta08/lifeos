'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface AuthFormProps {
  mode: 'login' | 'signup'
  initialError?: string
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.705 17.64 9.2Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  )
}

export function AuthForm({ mode, initialError }: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState<'google' | 'magic' | null>(null)
  const [error, setError] = useState<string | null>(initialError ?? null)
  const [sent, setSent] = useState(false)

  const next = mode === 'signup' ? '/onboarding' : '/dashboard'

  function callbackUrl() {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `${origin}/api/auth/callback?next=${next}`
  }

  async function handleGoogle() {
    setLoading('google')
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl(),
        scopes: 'openid email profile',
      },
    })
    if (error) {
      setError('Something went wrong. Please try again.')
      setLoading(null)
    }
    // On success the browser navigates away — no further state needed
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading('magic')
    setError(null)

    const supabase = createClient()
    await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: callbackUrl(),
        // Login page: don't create new accounts. Signup page: allow new accounts.
        shouldCreateUser: mode === 'signup',
      },
    })

    // Always show "check your inbox" — never reveal whether the email exists
    setLoading(null)
    setSent(true)
  }

  const isLoading = loading !== null

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#0B0C0E] flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">

        {/* Wordmark */}
        <div className="text-center mb-8">
          <p className="text-2xl font-semibold font-heading tracking-tight text-[#1D1D1F] dark:text-[#FAFAFA]">
            LifeOS
          </p>
          <p className="text-sm text-[#52525B] dark:text-[#A1A1AA] mt-1.5">
            Quietly watching so you don&apos;t have to.
          </p>
        </div>

        {/* Card */}
        <div
          className="bg-white dark:bg-[#18181B] rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] px-8 py-8"
          style={{ boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.05)' }}
        >
          <h1 className="text-xl font-semibold font-heading text-[#1D1D1F] dark:text-[#FAFAFA] mb-6">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </h1>

          {/* Error banner (from callback redirect or failed OAuth) */}
          {error && (
            <div className="mb-5 rounded-[10px] border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-3">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 h-11 rounded-[10px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] text-[#1D1D1F] dark:text-[#FAFAFA] text-sm font-medium transition-colors hover:bg-[#F5F5F7] dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === 'google' ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-[#E4E4E7] dark:border-[#27272A]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white dark:bg-[#18181B] px-3 text-xs text-[#52525B] dark:text-[#A1A1AA]">
                or
              </span>
            </div>
          </div>

          {/* Magic link */}
          {sent ? (
            <div className="rounded-[10px] border border-[#BBF7D0] dark:border-emerald-900 bg-[#F0FDF4] dark:bg-emerald-950/30 px-4 py-5 text-center">
              <Mail
                size={20}
                className="mx-auto mb-2 text-[#059669] dark:text-[#34D399]"
                strokeWidth={1.5}
              />
              <p className="text-sm font-medium text-[#1D1D1F] dark:text-[#FAFAFA]">
                Check your inbox
              </p>
              <p className="text-xs text-[#52525B] dark:text-[#A1A1AA] mt-1 leading-relaxed">
                If an account exists for <span className="font-medium">{email || 'that address'}</span>,
                a sign-in link is on its way.
              </p>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-3" noValidate>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[#1D1D1F] dark:text-[#FAFAFA] mb-1.5"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={isLoading}
                  className="w-full h-11 rounded-[10px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] text-[#1D1D1F] dark:text-[#FAFAFA] placeholder:text-[#A1A1AA] text-sm px-3.5 outline-none focus:ring-2 focus:ring-[#0369A1] dark:focus:ring-[#38BDF8] focus:ring-offset-0 disabled:opacity-50 transition-shadow"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="w-full flex items-center justify-center gap-2 h-11 rounded-[10px] bg-[#0369A1] dark:bg-[#38BDF8] text-white dark:text-[#0B0C0E] text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === 'magic' && <Loader2 size={16} className="animate-spin" />}
                Send magic link
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-[#52525B] dark:text-[#A1A1AA] mt-6">
          {mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <Link
                href="/signup"
                className="font-medium text-[#0369A1] dark:text-[#38BDF8] hover:underline"
              >
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-medium text-[#0369A1] dark:text-[#38BDF8] hover:underline"
              >
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
