import type { Metadata } from 'next'
import { AuthForm } from '../_components/AuthForm'

export const metadata: Metadata = {
  title: 'Create account — LifeOS',
}

interface Props {
  searchParams: { error?: string }
}

export default function SignupPage({ searchParams }: Props) {
  const error =
    searchParams.error === 'auth'
      ? 'Something went wrong. Please try again.'
      : undefined

  return <AuthForm mode="signup" initialError={error} />
}
