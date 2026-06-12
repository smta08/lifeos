'use client'

import { useState, useTransition } from 'react'
import { Loader2, Check } from 'lucide-react'
import { updateNotifications } from '@/features/settings/actions'

interface Props {
  notifyEmail:   boolean
  notifyCadence: string
}

export function NotificationsForm({ notifyEmail: initialEmail, notifyCadence: initialCadence }: Props) {
  const [notifyEmail,   setNotifyEmail]   = useState(initialEmail)
  const [notifyCadence, setNotifyCadence] = useState(initialCadence)
  const [saved,         setSaved]         = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [isPending,     startTransition]  = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)

    startTransition(async () => {
      const cadence = notifyEmail ? (notifyCadence as 'daily' | 'weekly') : 'off'
      const result  = await updateNotifications({ notifyEmail, notifyCadence: cadence })
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
      {/* Email toggle */}
      <div className="flex items-center justify-between gap-4 py-3 border-b border-[#E4E4E7] dark:border-[#27272A]">
        <div>
          <p className="text-sm font-medium text-[#1D1D1F] dark:text-[#FAFAFA]">Email notifications</p>
          <p className="text-xs text-[#52525B] dark:text-[#A1A1AA] mt-0.5">Receive digest emails from LifeOS</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={notifyEmail}
          onClick={() => setNotifyEmail((v) => !v)}
          className={[
            'relative flex-none w-10 h-6 rounded-full transition-colors duration-150 cursor-pointer',
            notifyEmail ? 'bg-[#0369A1] dark:bg-[#38BDF8]' : 'bg-[#E4E4E7] dark:bg-[#27272A]',
          ].join(' ')}
        >
          <span
            className={[
              'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-150',
              notifyEmail ? 'translate-x-5' : 'translate-x-1',
            ].join(' ')}
          />
        </button>
      </div>

      {/* Cadence */}
      {notifyEmail && (
        <div>
          <label htmlFor="cadence" className="block text-sm font-medium text-[#1D1D1F] dark:text-[#FAFAFA] mb-1.5">
            Frequency
          </label>
          <select
            id="cadence"
            value={notifyCadence}
            onChange={(e) => setNotifyCadence(e.target.value)}
            className="w-full h-10 rounded-[10px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] text-[#1D1D1F] dark:text-[#FAFAFA] text-sm px-3.5 outline-none focus:ring-2 focus:ring-[#0369A1] dark:focus:ring-[#38BDF8] cursor-pointer"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
      )}

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
