import type { Metadata } from 'next'
import { AuthForm } from '../_components/AuthForm'

export const metadata: Metadata = {
  title: 'Sign in — LifeOS',
}

interface Props {
  searchParams: { error?: string }
}

export default function LoginPage({ searchParams }: Props) {
  const errorMap: Record<string, string> = {
    auth: 'Sign-in failed. Check that Google OAuth is enabled in your Supabase project and try again.',
    server_error: 'A server error occurred. Please try again in a moment.',
  }
  const error = searchParams.error ? (errorMap[searchParams.error] ?? 'Something went wrong. Please try again.') : undefined

  return <AuthForm mode="login" initialError={error} />
}
