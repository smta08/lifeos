'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { Pencil, Trash2, Loader2, CalendarDays } from 'lucide-react'
import { FACT_TYPE_CONFIG, getDueDateUrgency, URGENCY_CLASSES } from '../constants'
import { archiveFact } from '../actions'
import type { Fact } from '@/domain/fact'

interface FactCardProps {
  fact: Fact
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-CA', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatAmount(amount: string | null, currency: string | null) {
  if (!amount) return null
  const num = parseFloat(amount)
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: currency ?? 'CAD',
    minimumFractionDigits: 2,
  }).format(num)
}

export function FactCard({ fact }: FactCardProps) {
  const [isPending, startTransition] = useTransition()

  const config = FACT_TYPE_CONFIG[fact.type]
  const Icon = config.icon
  const urgency = getDueDateUrgency(fact.dueDate)
  const dueDateColor = urgency ? URGENCY_CLASSES[urgency] : 'text-[#52525B] dark:text-[#A1A1AA]'
  const formattedAmount = formatAmount(fact.amount, fact.currency)

  function handleDelete() {
    if (!confirm(`Archive "${fact.title}"?`)) return
    startTransition(async () => { await archiveFact(fact.id) })
  }

  return (
    <div
      className={[
        'group relative bg-white dark:bg-[#18181B] rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] p-5',
        'transition-shadow duration-150 hover:shadow-card',
        isPending ? 'opacity-50 pointer-events-none' : '',
      ].join(' ')}
      style={{ boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.05)' }}
    >
      {/* Type badge */}
      <div className="flex items-start justify-between mb-3">
        <span
          className={[
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
            config.badgeBg, config.badgeText,
          ].join(' ')}
        >
          <Icon size={11} strokeWidth={2} />
          {config.label}
        </span>

        {/* Actions — visible on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <Link
            href={`/facts/${fact.id}/edit`}
            aria-label={`Edit ${fact.title}`}
            className="flex items-center justify-center w-8 h-8 rounded-[8px] text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F5F5F7] dark:hover:bg-[#27272A] transition-colors cursor-pointer"
          >
            <Pencil size={14} strokeWidth={1.5} />
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            aria-label={`Archive ${fact.title}`}
            disabled={isPending}
            className="flex items-center justify-center w-8 h-8 rounded-[8px] text-[#52525B] dark:text-[#A1A1AA] hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* Title + amount */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-[15px] font-medium text-[#1D1D1F] dark:text-[#FAFAFA] leading-snug line-clamp-2">
          {fact.title}
        </h3>
        {formattedAmount && (
          <span className="shrink-0 text-sm font-semibold text-[#1D1D1F] dark:text-[#FAFAFA] tabular-nums">
            {formattedAmount}
          </span>
        )}
      </div>

      {/* Due date */}
      {fact.dueDate && (
        <div className={['flex items-center gap-1.5 text-xs', dueDateColor].join(' ')}>
          <CalendarDays size={12} strokeWidth={1.5} />
          <span className="tabular-nums">
            {urgency === 'critical' || urgency === 'high'
              ? `Due ${formatDate(fact.dueDate)}`
              : formatDate(fact.dueDate)}
          </span>
          {urgency && urgency !== 'low' && (
            <span className="ml-1 font-medium capitalize">{urgency}</span>
          )}
        </div>
      )}

      {/* Category */}
      {fact.category && (
        <p className="mt-2 text-xs text-[#52525B] dark:text-[#A1A1AA] truncate">
          {fact.category}
        </p>
      )}
    </div>
  )
}
