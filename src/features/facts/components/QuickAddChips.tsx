'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'
import { createFact } from '../actions'
import { QUICK_ADD_PRESETS, makeFactInput, nextRenewalISO, type SubscriptionPreset } from '../presets'
import { useToast } from '@/components/Toast'

interface QuickAddChipsProps {
  // Lowercased titles of facts the user already tracks — locks matching chips.
  existingTitles: string[]
}

export function QuickAddChips({ existingTitles }: QuickAddChipsProps) {
  const router = useRouter()
  const toast = useToast()
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [pending, setPending] = useState<string | null>(null)

  const existing = new Set(existingTitles)

  async function handleAdd(preset: SubscriptionPreset) {
    setPending(preset.name)
    const result = await createFact(
      makeFactInput({
        type: 'subscription',
        title: preset.name,
        amount: preset.amount,
        dueDateISO: nextRenewalISO(preset.day),
        recurrence: 'monthly',
      }),
    )
    setPending(null)

    if (result.ok) {
      setAdded((prev) => new Set(prev).add(preset.name))
      toast(`${preset.name} added`)
      router.refresh()
    } else {
      toast(result.error.message)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_ADD_PRESETS.map((preset) => {
        const isAdded = added.has(preset.name) || existing.has(preset.name.toLowerCase())
        const isPending = pending === preset.name
        const Icon = preset.icon

        return (
          <button
            key={preset.name}
            type="button"
            disabled={isAdded || isPending}
            onClick={() => handleAdd(preset)}
            className={[
              'group flex items-center gap-2 rounded-control border px-3 py-2 text-sm font-medium transition-all duration-150',
              isAdded
                ? 'cursor-default border-[#059669]/30 bg-[#059669]/10 text-[#059669] dark:border-[#34D399]/30 dark:bg-[#34D399]/10 dark:text-[#34D399]'
                : 'border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] text-[#1D1D1F] dark:text-[#FAFAFA] hover:-translate-y-px hover:border-[#0369A1]/40 dark:hover:border-[#38BDF8]/40 hover:shadow-card disabled:opacity-60',
            ].join(' ')}
          >
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
              style={{ background: `${isAdded ? '#059669' : preset.color}1F` }}
            >
              <Icon size={13} strokeWidth={1.75} color={isAdded ? '#059669' : preset.color} />
            </span>
            {preset.name}
            {isPending ? (
              <Loader2 size={14} className="animate-spin text-[#52525B] dark:text-[#A1A1AA]" />
            ) : isAdded ? (
              <Check size={14} strokeWidth={2.5} />
            ) : (
              <span className="text-[#52525B] dark:text-[#A1A1AA] tabular-nums group-hover:text-[#0369A1] dark:group-hover:text-[#38BDF8]">
                +${preset.amount}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
