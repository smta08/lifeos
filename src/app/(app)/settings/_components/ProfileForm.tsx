'use client'

import { useState, useTransition } from 'react'
import { Loader2, Check } from 'lucide-react'
import { updateProfile } from '@/features/settings/actions'

const TIMEZONES = [
  'UTC',
  'America/Toronto',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Vancouver',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Kolkata',
  'Australia/Sydney',
]

interface Props {
  displayName: string | null
  timezone:    string
}

export function ProfileForm({ displayName: initialName, timezone: initialTz }: Props) {
  const [displayName, setDisplayName] = useState(initialName ?? '')
  const [timezone,    setTimezone]    = useState(initialTz)
  const [saved,       setSaved]       = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [isPending,   startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)

    startTransition(async () => {
      const result = await updateProfile({ displayName: displayName || undefined, timezone })
      if (result.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      } else {
        setError(result.error.message)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-sm">
      <div>
        <label htmlFor="displayName" className="block text-sm font-medium text-[#1D1D1F] dark:text-[#FAFAFA] mb-1.5">
          Display name
        </label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
          className="w-full h-10 rounded-[10px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] text-[#1D1D1F] dark:text-[#FAFAFA] placeholder:text-[#A1A1AA] text-sm px-3.5 outline-none focus:ring-2 focus:ring-[#0369A1] dark:focus:ring-[#38BDF8]"
        />
      </div>

      <div>
        <label htmlFor="timezone" className="block text-sm font-medium text-[#1D1D1F] dark:text-[#FAFAFA] mb-1.5">
          Timezone
        </label>
        <select
          id="timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full h-10 rounded-[10px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] text-[#1D1D1F] dark:text-[#FAFAFA] text-sm px-3.5 outline-none focus:ring-2 focus:ring-[#0369A1] dark:focus:ring-[#38BDF8] cursor-pointer"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#0369A1] dark:bg-[#38BDF8] text-white dark:text-[#0B0C0E] text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
      >
        {isPending && <Loader2 size={14} className="animate-spin" />}
        {saved && <Check size={14} strokeWidth={2.5} />}
        {isPending ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
      </button>
    </form>
  )
}
