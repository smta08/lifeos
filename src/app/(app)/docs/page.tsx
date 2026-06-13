import type { Metadata } from 'next'
import { requireUser } from '@/services/auth/requireUser'
import { DropZone } from '@/features/docs/components/DropZone'

export const metadata: Metadata = {
  title: 'Docs — LifeOS',
}

export default async function DocsPage() {
  // Gate the route on an authenticated session, consistent with other app pages.
  await requireUser()

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold font-heading text-[#1D1D1F] dark:text-[#FAFAFA]">
          Documents
        </h1>
        <p className="mt-0.5 text-sm text-[#52525B] dark:text-[#A1A1AA]">
          Drop a file to pull out the dates and amounts — extraction runs on your device, the file is never stored.
        </p>
      </div>

      <DropZone />
    </div>
  )
}
