'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, ScanLine, Check, X, Loader2, TrendingUp, AlertCircle } from 'lucide-react'
import { createFact } from '@/features/facts/actions'
import { makeFactInput } from '@/features/facts/presets'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'
import {
  fetchGmailSuggestions, GmailScopeError, GmailAuthError, type GmailMatch,
} from '../gmail'

type Phase = 'idle' | 'connecting' | 'scanning' | 'results' | 'error'

interface ScanItem extends GmailMatch {
  key: string
}

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'
const STEPS = ['Connecting to Gmail…', 'Fetching emails…', 'Matching patterns…']

export function GmailScan() {
  const router = useRouter()
  const toast = useToast()
  const [phase, setPhase] = useState<Phase>('idle')
  const [step, setStep] = useState(0)
  const [foundCount, setFoundCount] = useState(0)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [items, setItems] = useState<ScanItem[]>([])
  const [processed, setProcessed] = useState(0)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const started = useRef(false)

  // After the OAuth redirect lands back on /scan, the session carries a fresh
  // provider_token — auto-start the scan with it.
  useEffect(() => {
    if (started.current) return
    started.current = true
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.provider_token
      if (token) startScan(token)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function connect() {
    setPhase('connecting')
    setHint(null)
    const supabase = createClient()
    const origin = window.location.origin
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: GMAIL_SCOPE,
        redirectTo: `${origin}/api/auth/callback?next=/scan`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
    if (error) {
      setPhase('idle')
      setHint('Could not start Google sign-in. Please try again.')
    }
    // On success the browser redirects to Google, then back to /scan.
  }

  async function startScan(token: string) {
    setPhase('scanning')
    setStep(0)
    setProcessed(0)
    try {
      setStep(1)
      const matches = await fetchGmailSuggestions(token, {
        onListed: (n) => { setFoundCount(n); setStep(2) },
        onProgress: (done, total) => setProgress({ done, total }),
      })
      setItems(matches.map((m, i) => ({ ...m, key: `${m.id}-${i}` })))
      setPhase('results')
    } catch (err) {
      if (err instanceof GmailScopeError) {
        setPhase('idle')
        setHint('LifeOS needs read-only Gmail access. Connect again and approve the Gmail permission.')
      } else if (err instanceof GmailAuthError) {
        setPhase('idle')
        setHint('Your Google session expired. Connect again to scan.')
      } else {
        setPhase('error')
      }
    }
  }

  function remove(key: string) {
    setItems((prev) => prev.filter((x) => x.key !== key))
    setProcessed((n) => n + 1)
  }

  async function approve(item: ScanItem) {
    setPendingId(item.key)
    const result = await createFact(
      makeFactInput({
        type: item.factType,
        title: item.name,
        amount: item.amount ?? undefined,
        dueDateISO: item.dateISO ?? undefined,
        recurrence: item.factType === 'subscription' ? 'monthly' : 'none',
      }),
    )
    setPendingId(null)
    if (result.ok) {
      toast(`${item.name} added`)
      remove(item.key)
      router.refresh()
    } else {
      toast(result.error.message)
    }
  }

  // ── Idle / connecting ──
  if (phase === 'idle' || phase === 'connecting') {
    return (
      <div className="flex flex-col items-center rounded-card border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] py-16 text-center shadow-card">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0369A1]/10 dark:bg-[#38BDF8]/10">
          <Mail size={28} strokeWidth={1.5} className="text-[#0369A1] dark:text-[#38BDF8]" />
        </div>
        <p className="mt-4 text-base font-medium text-[#1D1D1F] dark:text-[#FAFAFA]">
          Connect Gmail to scan
        </p>
        <p className="mt-1 max-w-sm text-sm text-[#52525B] dark:text-[#A1A1AA]">
          Read-only access. Your emails are scanned in your browser and never stored — only the
          subscriptions you approve are saved.
        </p>
        {hint && (
          <div className="mt-4 flex items-start gap-2 rounded-control border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-left">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-xs text-amber-700 dark:text-amber-300">{hint}</p>
          </div>
        )}
        <button
          type="button"
          onClick={connect}
          disabled={phase === 'connecting'}
          className="mt-5 flex items-center gap-2 rounded-control bg-[#0369A1] dark:bg-[#38BDF8] px-5 py-2.5 text-sm font-semibold text-white dark:text-[#0B0C0E] transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {phase === 'connecting' ? <Loader2 size={16} className="animate-spin" /> : <ScanLine size={16} />}
          {phase === 'connecting' ? 'Redirecting…' : 'Connect & scan'}
        </button>
      </div>
    )
  }

  // ── Scanning ──
  if (phase === 'scanning') {
    return (
      <div className="rounded-card border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] p-8 shadow-card">
        <div className="mx-auto max-w-sm space-y-3">
          {STEPS.map((label, i) => {
            const done = i < step
            const active = i === step
            const showCount = i === 1 && foundCount > 0
            const showProg = i === 2 && progress.total > 0
            return (
              <div
                key={label}
                className={['flex items-center gap-3 transition-opacity', i > step ? 'opacity-30' : 'opacity-100'].join(' ')}
              >
                <span
                  className={[
                    'flex h-7 w-7 items-center justify-center rounded-full',
                    done ? 'bg-[#059669]/15 dark:bg-[#34D399]/15'
                      : active ? 'bg-[#0369A1]/15 dark:bg-[#38BDF8]/15'
                      : 'bg-[#F5F5F7] dark:bg-[#27272A]',
                  ].join(' ')}
                >
                  {done ? <Check size={14} strokeWidth={2.5} className="text-[#059669] dark:text-[#34D399]" />
                    : active ? <Loader2 size={14} className="animate-spin text-[#0369A1] dark:text-[#38BDF8]" />
                    : <span className="text-xs text-[#52525B] dark:text-[#A1A1AA]">{i + 1}</span>}
                </span>
                <span className={['text-sm', active ? 'font-medium text-[#1D1D1F] dark:text-[#FAFAFA]' : 'text-[#52525B] dark:text-[#A1A1AA]'].join(' ')}>
                  {label}
                  {showCount && <span className="ml-1 tabular-nums">({foundCount})</span>}
                  {showProg && <span className="ml-1 tabular-nums">({progress.done}/{progress.total})</span>}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Error ──
  if (phase === 'error') {
    return (
      <div className="flex items-center gap-3 rounded-card border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-5">
        <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
        <div className="flex-1">
          <p className="text-sm font-medium text-[#1D1D1F] dark:text-[#FAFAFA]">Scan failed</p>
          <p className="text-xs text-[#52525B] dark:text-[#A1A1AA]">Something went wrong reaching Gmail. Try connecting again.</p>
        </div>
        <button onClick={() => { setPhase('idle'); setHint(null) }} className="text-sm font-medium text-[#0369A1] dark:text-[#38BDF8]">
          Retry
        </button>
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
          <p className="text-base font-medium text-[#1D1D1F] dark:text-[#FAFAFA]">
            {processed === 0 ? 'No subscriptions found' : 'All caught up'}
          </p>
          <p className="mt-1 max-w-xs text-sm text-[#52525B] dark:text-[#A1A1AA]">
            {processed === 0
              ? 'We didn’t spot subscription emails in the last year. You can still add them manually.'
              : `You reviewed all ${processed} suggestions. Check the Dashboard or Timeline.`}
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
                const isPending = pendingId === item.key
                return (
                  <motion.div
                    key={item.key}
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
                        {item.amount !== null && (
                          <span className="text-xs tabular-nums text-[#52525B] dark:text-[#A1A1AA]">
                            ${item.amount.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-[#52525B] dark:text-[#A1A1AA]">{item.subject}</p>
                      <p className="truncate text-[11px] text-[#A1A1AA] dark:text-[#52525B]">{item.sender}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => remove(item.key)}
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
