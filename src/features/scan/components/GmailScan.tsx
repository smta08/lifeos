'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, ScanLine, Check, X, Loader2, TrendingUp } from 'lucide-react'
import { createFact } from '@/features/facts/actions'
import { GMAIL_SUGGESTIONS, makeFactInput, nextRenewalISO, type GmailSuggestion } from '@/features/facts/presets'
import { useToast } from '@/components/Toast'

type Phase = 'idle' | 'scanning' | 'results'

interface ScanItem extends GmailSuggestion {
  id: string
}

const STEP_LABELS = ['Connecting…', 'Fetching emails…', 'Matching patterns…', 'Found 7 items']

export function GmailScan() {
  const router = useRouter()
  const toast = useToast()
  const [phase, setPhase] = useState<Phase>('idle')
  const [step, setStep] = useState(-1)
  const [items, setItems] = useState<ScanItem[]>([])
  const [processed, setProcessed] = useState(0)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  function connect() {
    setPhase('scanning')
    setStep(0)
    timers.current = [
      setTimeout(() => setStep(1), 400),
      setTimeout(() => setStep(2), 900),
      setTimeout(() => setStep(3), 1600),
      setTimeout(() => {
        setItems(GMAIL_SUGGESTIONS.map((s, i) => ({ ...s, id: `${s.name}-${i}` })))
        setPhase('results')
      }, 2800),
    ]
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((x) => x.id !== id))
    setProcessed((n) => n + 1)
  }

  async function approve(item: ScanItem) {
    setPendingId(item.id)
    const result = await createFact(
      makeFactInput({
        type: item.type,
        title: item.name,
        amount: item.amount,
        dueDateISO: nextRenewalISO(item.day),
        recurrence: item.type === 'insurance' ? 'yearly' : 'monthly',
      }),
    )
    setPendingId(null)

    if (result.ok) {
      toast(`${item.name} added`)
      remove(item.id)
      router.refresh()
    } else {
      toast(result.error.message)
    }
  }

  // ── Idle ──
  if (phase === 'idle') {
    return (
      <div className="flex flex-col items-center rounded-card border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] py-16 text-center shadow-card">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0369A1]/10 dark:bg-[#38BDF8]/10">
          <Mail size={28} strokeWidth={1.5} className="text-[#0369A1] dark:text-[#38BDF8]" />
        </div>
        <p className="mt-4 text-base font-medium text-[#1D1D1F] dark:text-[#FAFAFA]">
          Connect Gmail to scan
        </p>
        <p className="mt-1 max-w-xs text-sm text-[#52525B] dark:text-[#A1A1AA]">
          Read-only. We extract renewal facts and never store your emails.{' '}
          <span className="text-[#A1A1AA] dark:text-[#52525B]">(Simulated in this demo.)</span>
        </p>
        <button
          type="button"
          onClick={connect}
          className="mt-5 flex items-center gap-2 rounded-control bg-[#0369A1] dark:bg-[#38BDF8] px-5 py-2.5 text-sm font-semibold text-white dark:text-[#0B0C0E] transition-opacity hover:opacity-90"
        >
          <ScanLine size={16} /> Connect &amp; scan
        </button>
      </div>
    )
  }

  // ── Scanning ──
  if (phase === 'scanning') {
    return (
      <div className="rounded-card border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] p-8 shadow-card">
        <div className="mx-auto max-w-sm space-y-3">
          {STEP_LABELS.map((label, i) => {
            const done = i < step
            const active = i === step
            return (
              <div
                key={label}
                className={['flex items-center gap-3 transition-opacity', i > step ? 'opacity-30' : 'opacity-100'].join(' ')}
              >
                <span
                  className={[
                    'flex h-7 w-7 items-center justify-center rounded-full',
                    done
                      ? 'bg-[#059669]/15 dark:bg-[#34D399]/15'
                      : active
                        ? 'bg-[#0369A1]/15 dark:bg-[#38BDF8]/15'
                        : 'bg-[#F5F5F7] dark:bg-[#27272A]',
                  ].join(' ')}
                >
                  {done ? (
                    <Check size={14} strokeWidth={2.5} className="text-[#059669] dark:text-[#34D399]" />
                  ) : active ? (
                    <Loader2 size={14} className="animate-spin text-[#0369A1] dark:text-[#38BDF8]" />
                  ) : (
                    <span className="text-xs text-[#52525B] dark:text-[#A1A1AA]">{i + 1}</span>
                  )}
                </span>
                <span
                  className={[
                    'text-sm',
                    active ? 'font-medium text-[#1D1D1F] dark:text-[#FAFAFA]' : 'text-[#52525B] dark:text-[#A1A1AA]',
                  ].join(' ')}
                >
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Results ──
  const remaining = items.length
  return (
    <div>
      <p className="mb-4 text-sm text-[#52525B] dark:text-[#A1A1AA]">
        <span className="tabular-nums">{processed}</span> processed ·{' '}
        <span className="tabular-nums">{remaining}</span> to review
      </p>

      {remaining === 0 ? (
        <div className="flex flex-col items-center rounded-card border border-dashed border-[#E4E4E7] dark:border-[#27272A] py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#059669]/15 dark:bg-[#34D399]/15">
            <Check size={22} strokeWidth={2} className="text-[#059669] dark:text-[#34D399]" />
          </div>
          <p className="text-base font-medium text-[#1D1D1F] dark:text-[#FAFAFA]">All caught up</p>
          <p className="mt-1 text-sm text-[#52525B] dark:text-[#A1A1AA]">
            You reviewed all {processed} suggestions. Check the Dashboard or Timeline.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-3 rounded-card border border-[#059669]/20 dark:border-[#34D399]/20 bg-[#059669]/[0.06] dark:bg-[#34D399]/[0.06] px-4 py-3">
            <TrendingUp size={16} className="text-[#059669] dark:text-[#34D399]" />
            <p className="text-sm text-[#1D1D1F] dark:text-[#FAFAFA]">
              Found these in your inbox. Approve the ones you want to track.
            </p>
          </div>

          <div className="grid gap-2.5">
            <AnimatePresence>
              {items.map((item) => {
                const Icon = item.icon
                const isPending = pendingId === item.id
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="flex items-center gap-4 rounded-card border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] p-4 shadow-card"
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: `${item.color}1F` }}
                    >
                      <Icon size={20} strokeWidth={1.75} color={item.color} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[#1D1D1F] dark:text-[#FAFAFA]">{item.name}</p>
                        <span className="text-xs tabular-nums text-[#52525B] dark:text-[#A1A1AA]">
                          ${item.amount.toFixed(2)}/mo
                        </span>
                      </div>
                      <p className="truncate text-xs text-[#52525B] dark:text-[#A1A1AA]">{item.subject}</p>
                      <p className="truncate text-[11px] text-[#A1A1AA] dark:text-[#52525B]">{item.sender}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => remove(item.id)}
                        disabled={isPending}
                        aria-label={`Dismiss ${item.name}`}
                        className="flex h-9 w-9 items-center justify-center rounded-control border border-[#E4E4E7] dark:border-[#27272A] text-[#52525B] dark:text-[#A1A1AA] transition-colors hover:bg-[#F5F5F7] dark:hover:bg-[#27272A] disabled:opacity-50"
                      >
                        <X size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => approve(item)}
                        disabled={isPending}
                        className="flex h-9 items-center gap-1.5 rounded-control bg-[#0369A1] dark:bg-[#38BDF8] px-3.5 text-sm font-semibold text-white dark:text-[#0B0C0E] transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={2.5} />}
                        Approve
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  )
}
