'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Clock, CheckCircle, ChevronDown, Loader2 } from 'lucide-react'
import type { AlertJSON } from '@/domain/alert'
import type { Urgency } from '@/domain/urgency'

const URGENCY_BORDER: Record<Urgency, string> = {
  critical: 'border-l-red-600',
  high:     'border-l-orange-600',
  medium:   'border-l-amber-500',
  low:      'border-l-zinc-400',
}

const URGENCY_DOT: Record<Urgency, string> = {
  critical: 'bg-red-600',
  high:     'bg-orange-600',
  medium:   'bg-amber-500',
  low:      'bg-zinc-400',
}

const URGENCY_LABEL: Record<Urgency, string> = {
  critical: 'Critical',
  high:     'High',
  medium:   'Medium',
  low:      'Low',
}

const SNOOZE_OPTIONS = [
  { label: '1 day',   days: 1 },
  { label: '3 days',  days: 3 },
  { label: '1 week',  days: 7 },
  { label: '1 month', days: 30 },
]

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(9, 0, 0, 0)
  return d.toISOString()
}

interface Props {
  alert: AlertJSON
  onDismiss: () => void
  onSnooze:  (until: string) => void
  onResolve: () => void
  isPending?: boolean
}

export function AlertCard({ alert, onDismiss, onSnooze, onResolve, isPending }: Props) {
  const [showSnooze, setShowSnooze] = useState(false)
  const [resolving, setResolving]   = useState(false)

  function handleResolve() {
    setResolving(true)
    onResolve()
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -12, scale: 0.97 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={[
        'relative bg-white dark:bg-[#18181B] rounded-2xl border border-[#E4E4E7] dark:border-[#27272A]',
        'border-l-4 p-5',
        URGENCY_BORDER[alert.urgency],
      ].join(' ')}
      style={{ boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.05)' }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {/* Urgency dot */}
          <span
            className={`flex-none w-2 h-2 rounded-full mt-0.5 ${URGENCY_DOT[alert.urgency]}`}
            aria-label={URGENCY_LABEL[alert.urgency]}
          />
          <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#FAFAFA] leading-snug">
            {alert.title}
          </h3>
        </div>

        {/* Category pill */}
        <span className="flex-none text-xs font-medium px-2 py-0.5 rounded-full bg-[#F5F5F7] dark:bg-[#27272A] text-[#52525B] dark:text-[#A1A1AA] capitalize whitespace-nowrap">
          {alert.category}
        </span>
      </div>

      {/* Evidence chip */}
      {alert.evidenceFacts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {alert.evidenceFacts.map((f) => (
            <span
              key={f.id}
              className="inline-flex items-center gap-1 text-xs text-[#52525B] dark:text-[#A1A1AA] bg-[#F5F5F7] dark:bg-[#27272A] px-2 py-0.5 rounded-full"
            >
              <span className="text-[10px] font-medium uppercase tracking-wide opacity-60">from</span>
              {f.title}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Primary */}
        <button
          onClick={handleResolve}
          disabled={isPending || resolving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#0369A1] dark:bg-[#38BDF8] text-white dark:text-[#0B0C0E] text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
        >
          {resolving
            ? <Loader2 size={12} className="animate-spin" />
            : <CheckCircle size={12} strokeWidth={2} />
          }
          {resolving ? 'Done…' : 'Mark done'}
        </button>

        {/* Snooze — relative container for dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSnooze((s) => !s)}
            disabled={isPending}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] border border-[#E4E4E7] dark:border-[#27272A] text-xs text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F5F5F7] dark:hover:bg-[#27272A] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Clock size={12} strokeWidth={1.5} />
            Snooze
            <ChevronDown size={10} strokeWidth={2} className={`transition-transform ${showSnooze ? 'rotate-180' : ''}`} />
          </button>

          {showSnooze && (
            <div className="absolute left-0 top-full mt-1.5 z-20 bg-white dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#27272A] rounded-[10px] shadow-lg overflow-hidden min-w-[120px]">
              {SNOOZE_OPTIONS.map((opt) => (
                <button
                  key={opt.days}
                  onClick={() => {
                    setShowSnooze(false)
                    onSnooze(addDays(opt.days))
                  }}
                  className="block w-full text-left px-3.5 py-2 text-xs text-[#1D1D1F] dark:text-[#FAFAFA] hover:bg-[#F5F5F7] dark:hover:bg-[#27272A] transition-colors cursor-pointer"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          disabled={isPending}
          aria-label="Dismiss alert"
          className="ml-auto p-1.5 rounded-[8px] text-[#A1A1AA] hover:text-[#52525B] dark:hover:text-[#FAFAFA] hover:bg-[#F5F5F7] dark:hover:bg-[#27272A] transition-colors disabled:opacity-50 cursor-pointer"
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>
    </motion.div>
  )
}
