import type { Metadata } from 'next'
import { requireUser } from '@/services/auth/requireUser'
import { GmailScan } from '@/features/scan/components/GmailScan'

export const metadata: Metadata = {
  title: 'Gmail scan — LifeOS',
}

export default async function ScanPage() {
  await requireUser()

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold font-heading text-[#1D1D1F] dark:text-[#FAFAFA]">
          Gmail scan
        </h1>
        <p className="mt-0.5 text-sm text-[#52525B] dark:text-[#A1A1AA]">
          Find subscriptions hiding in your inbox — review each before it&apos;s tracked.
        </p>
      </div>

      <GmailScan />
    </div>
  )
}
