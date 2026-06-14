'use client'

import { RefreshCw } from 'lucide-react'

// Error boundary for the authenticated app. A failed data fetch shows a calm, recoverable
// message instead of a blank screen — visual stability is part of the trust promise.
// Next.js logs the underlying error and its digest server-side; the client stays generic.
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-md mx-auto mt-24 text-center">
      <h1 className="text-lg font-semibold font-heading text-[#1D1D1F] dark:text-[#FAFAFA]">
        Something didn&apos;t load
      </h1>
      <p className="mt-2 text-sm text-[#52525B] dark:text-[#A1A1AA]">
        We couldn&apos;t load this page just now. Your data is safe — this is on our end.
      </p>
      <button
        onClick={reset}
        className="mt-6 inline-flex items-center gap-2 rounded-[10px] bg-[#0369A1] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 dark:bg-[#38BDF8] dark:text-[#0B0C0E]"
      >
        <RefreshCw size={18} strokeWidth={1.5} />
        Try again
      </button>
    </div>
  )
}
