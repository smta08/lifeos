'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { FACT_TYPE_CONFIG } from '@/features/facts/constants'
import { createFact } from '@/features/facts/actions'
import type { FactType } from '@/domain/fact'
import type { CreateFactInput } from '@/features/facts/schema'

const FACT_TYPES = Object.entries(FACT_TYPE_CONFIG) as [FactType, typeof FACT_TYPE_CONFIG[FactType]][]
const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP', 'AUD'] as const
const RECURRENCES = [
  { value: 'none', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
] as const

export default function NewFactPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [selectedType, setSelectedType] = useState<FactType | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [title, setTitle]         = useState('')
  const [category, setCategory]   = useState('')
  const [amount, setAmount]       = useState('')
  const [currency, setCurrency]   = useState<'CAD' | 'USD' | 'EUR' | 'GBP' | 'AUD'>('CAD')
  const [dueDate, setDueDate]     = useState('')
  const [recurrence, setRecurrence] = useState<'none' | 'weekly' | 'monthly' | 'yearly'>('none')

  const config = selectedType ? FACT_TYPE_CONFIG[selectedType] : null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedType) { setError('Please select a type.'); return }
    if (!title.trim())  { setError('Title is required.'); return }
    setError(null)

    const input: CreateFactInput = {
      type:       selectedType,
      title:      title.trim(),
      category:   category.trim() || undefined,
      amount:     amount.trim() || undefined,
      currency,
      dueDate:    dueDate ? new Date(dueDate).toISOString() : undefined,
      recurrence,
      metadata:   {},
    }

    startTransition(async () => {
      const result = await createFact(input)
      if (result.ok) {
        router.push('/facts')
      } else {
        setError(result.error.message)
      }
    })
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Back nav */}
      <Link
        href="/facts"
        className="inline-flex items-center gap-1.5 text-sm text-[#52525B] dark:text-[#A1A1AA] hover:text-[#1D1D1F] dark:hover:text-[#FAFAFA] mb-6 transition-colors cursor-pointer"
      >
        <ChevronLeft size={16} strokeWidth={1.5} />
        Memory
      </Link>

      <h1 className="text-2xl font-semibold font-heading text-[#1D1D1F] dark:text-[#FAFAFA] mb-6">
        Add fact
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type selector */}
        <div>
          <label className="block text-sm font-medium text-[#1D1D1F] dark:text-[#FAFAFA] mb-3">
            Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {FACT_TYPES.map(([type, cfg]) => {
              const Icon = cfg.icon
              const isSelected = selectedType === type
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={[
                    'flex flex-col items-center gap-1.5 p-3 rounded-[10px] border text-xs font-medium transition-all duration-150 cursor-pointer',
                    isSelected
                      ? `${cfg.badgeBg} ${cfg.badgeText} border-current`
                      : 'border-[#E4E4E7] dark:border-[#27272A] text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F5F5F7] dark:hover:bg-[#27272A]',
                  ].join(' ')}
                >
                  <Icon size={20} strokeWidth={1.5} />
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Fields — shown once type is selected */}
        {selectedType && (
          <div
            className="space-y-4 bg-white dark:bg-[#18181B] rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] p-5"
            style={{ boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.05)' }}
          >
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-[#1D1D1F] dark:text-[#FAFAFA] mb-1.5">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`e.g. ${config?.label === 'Subscription' ? 'Netflix' : config?.label ?? 'Add a name'}`}
                required
                className="w-full h-10 rounded-[10px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] text-[#1D1D1F] dark:text-[#FAFAFA] placeholder:text-[#A1A1AA] text-sm px-3.5 outline-none focus:ring-2 focus:ring-[#0369A1] dark:focus:ring-[#38BDF8]"
              />
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-[#1D1D1F] dark:text-[#FAFAFA] mb-1.5">
                Category <span className="text-[#A1A1AA] font-normal">(optional)</span>
              </label>
              <input
                id="category"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Entertainment, Finance…"
                className="w-full h-10 rounded-[10px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] text-[#1D1D1F] dark:text-[#FAFAFA] placeholder:text-[#A1A1AA] text-sm px-3.5 outline-none focus:ring-2 focus:ring-[#0369A1] dark:focus:ring-[#38BDF8]"
              />
            </div>

            {/* Amount + Currency */}
            {config?.hasAmount && (
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-[#1D1D1F] dark:text-[#FAFAFA] mb-1.5">
                  Amount <span className="text-[#A1A1AA] font-normal">(optional)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 h-10 rounded-[10px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] text-[#1D1D1F] dark:text-[#FAFAFA] placeholder:text-[#A1A1AA] text-sm px-3.5 tabular-nums outline-none focus:ring-2 focus:ring-[#0369A1] dark:focus:ring-[#38BDF8]"
                  />
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as typeof currency)}
                    className="h-10 rounded-[10px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] text-[#1D1D1F] dark:text-[#FAFAFA] text-sm px-3 outline-none focus:ring-2 focus:ring-[#0369A1] dark:focus:ring-[#38BDF8] cursor-pointer"
                  >
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Due date */}
            {config?.hasDueDate && (
              <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-[#1D1D1F] dark:text-[#FAFAFA] mb-1.5">
                  {selectedType === 'task' || selectedType === 'goal' ? 'Target date' : 'Due / Expiry date'}{' '}
                  <span className="text-[#A1A1AA] font-normal">(optional)</span>
                </label>
                <input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full h-10 rounded-[10px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] text-[#1D1D1F] dark:text-[#FAFAFA] text-sm px-3.5 tabular-nums outline-none focus:ring-2 focus:ring-[#0369A1] dark:focus:ring-[#38BDF8] cursor-pointer"
                />
              </div>
            )}

            {/* Recurrence */}
            {config?.hasRecurrence && (
              <div>
                <label htmlFor="recurrence" className="block text-sm font-medium text-[#1D1D1F] dark:text-[#FAFAFA] mb-1.5">
                  Recurrence
                </label>
                <select
                  id="recurrence"
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as typeof recurrence)}
                  className="w-full h-10 rounded-[10px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] text-[#1D1D1F] dark:text-[#FAFAFA] text-sm px-3.5 outline-none focus:ring-2 focus:ring-[#0369A1] dark:focus:ring-[#38BDF8] cursor-pointer"
                >
                  {RECURRENCES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending || !selectedType}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-[#0369A1] dark:bg-[#38BDF8] text-white dark:text-[#0B0C0E] text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPending && <Loader2 size={16} className="animate-spin" />}
            Save fact
          </button>
          <Link
            href="/facts"
            className="px-5 py-2.5 rounded-[10px] text-sm text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F5F5F7] dark:hover:bg-[#27272A] transition-colors cursor-pointer"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
