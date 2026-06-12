'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ChevronRight, CreditCard, FileText, ShieldCheck, CheckCircle } from 'lucide-react'
import { createFact } from '@/features/facts/actions'

type DocType = 'passport' | 'license' | 'insurance'

interface FactSummary {
  title:    string
  subtitle: string
}

const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: 'passport',  label: 'Passport' },
  { value: 'license',   label: "Driver's licence" },
  { value: 'insurance', label: 'Insurance' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState<FactSummary[]>([])

  // Step 1 fields
  const [subTitle,  setSubTitle]  = useState('')
  const [subAmount, setSubAmount] = useState('')
  const [subDate,   setSubDate]   = useState('')

  // Step 2 fields
  const [docType,  setDocType]  = useState<DocType>('passport')
  const [docTitle, setDocTitle] = useState('')
  const [docDate,  setDocDate]  = useState('')

  function handleSkip() {
    if (step === 1) setStep(2)
    else if (step === 2) setStep(3)
    else router.push('/dashboard')
  }

  function submitStep1(e: React.FormEvent) {
    e.preventDefault()
    if (!subTitle.trim()) { setError('Title is required.'); return }
    setError(null)

    startTransition(async () => {
      const result = await createFact({
        type:       'subscription',
        title:      subTitle.trim(),
        amount:     subAmount.trim() || undefined,
        currency:   'CAD',
        dueDate:    subDate ? new Date(subDate).toISOString() : undefined,
        recurrence: 'monthly',
        metadata:   {},
      })

      if (!result.ok) { setError(result.error.message); return }

      setAdded((prev) => [...prev, {
        title:    subTitle.trim(),
        subtitle: subAmount ? `$${subAmount}/mo` : 'Subscription',
      }])
      setStep(2)
    })
  }

  function submitStep2(e: React.FormEvent) {
    e.preventDefault()
    if (!docTitle.trim()) { setError('Title is required.'); return }
    setError(null)

    startTransition(async () => {
      const result = await createFact({
        type:       docType,
        title:      docTitle.trim(),
        dueDate:    docDate ? new Date(docDate).toISOString() : undefined,
        currency:   'CAD',
        recurrence: 'none',
        metadata:   {},
      })

      if (!result.ok) { setError(result.error.message); return }

      setAdded((prev) => [...prev, {
        title:    docTitle.trim(),
        subtitle: DOC_TYPES.find((d) => d.value === docType)?.label ?? docType,
      }])
      setStep(3)
    })
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#0B0C0E] flex items-center justify-center p-4">
      <div
        className="w-full max-w-md bg-white dark:bg-[#18181B] rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] p-8"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.05)' }}
      >
        {/* Progress dots */}
        <div className="flex items-center gap-2 mb-8">
          {([1, 2, 3] as const).map((s) => (
            <div
              key={s}
              className={[
                'h-1.5 rounded-full transition-all duration-300',
                s === step ? 'w-8 bg-[#0369A1] dark:bg-[#38BDF8]' : s < step ? 'w-4 bg-[#0369A1]/50 dark:bg-[#38BDF8]/50' : 'w-4 bg-[#E4E4E7] dark:bg-[#27272A]',
              ].join(' ')}
            />
          ))}
        </div>

        {/* Step 1 — Subscription */}
        {step === 1 && (
          <form onSubmit={submitStep1} className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#EFF6FF] dark:bg-[#0369A1]/20">
                <CreditCard size={20} strokeWidth={1.5} className="text-[#0369A1] dark:text-[#38BDF8]" />
              </div>
              <div>
                <h1 className="text-lg font-semibold font-heading text-[#1D1D1F] dark:text-[#FAFAFA]">
                  Add a subscription
                </h1>
                <p className="text-sm text-[#52525B] dark:text-[#A1A1AA]">Netflix, Spotify, gym — anything recurring.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="subTitle" className="block text-sm font-medium text-[#1D1D1F] dark:text-[#FAFAFA] mb-1.5">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="subTitle"
                  type="text"
                  value={subTitle}
                  onChange={(e) => setSubTitle(e.target.value)}
                  placeholder="e.g. Netflix"
                  autoFocus
                  className="w-full h-10 rounded-[10px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] text-[#1D1D1F] dark:text-[#FAFAFA] placeholder:text-[#A1A1AA] text-sm px-3.5 outline-none focus:ring-2 focus:ring-[#0369A1] dark:focus:ring-[#38BDF8]"
                />
              </div>

              <div>
                <label htmlFor="subAmount" className="block text-sm font-medium text-[#1D1D1F] dark:text-[#FAFAFA] mb-1.5">
                  Monthly amount <span className="text-[#A1A1AA] font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#A1A1AA]">$</span>
                  <input
                    id="subAmount"
                    type="text"
                    inputMode="decimal"
                    value={subAmount}
                    onChange={(e) => setSubAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-10 rounded-[10px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] text-[#1D1D1F] dark:text-[#FAFAFA] placeholder:text-[#A1A1AA] text-sm pl-7 pr-3.5 tabular-nums outline-none focus:ring-2 focus:ring-[#0369A1] dark:focus:ring-[#38BDF8]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="subDate" className="block text-sm font-medium text-[#1D1D1F] dark:text-[#FAFAFA] mb-1.5">
                  Next renewal date <span className="text-[#A1A1AA] font-normal">(optional)</span>
                </label>
                <input
                  id="subDate"
                  type="date"
                  value={subDate}
                  onChange={(e) => setSubDate(e.target.value)}
                  className="w-full h-10 rounded-[10px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] text-[#1D1D1F] dark:text-[#FAFAFA] text-sm px-3.5 tabular-nums outline-none focus:ring-2 focus:ring-[#0369A1] dark:focus:ring-[#38BDF8] cursor-pointer"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-[10px] bg-[#0369A1] dark:bg-[#38BDF8] text-white dark:text-[#0B0C0E] text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {isPending && <Loader2 size={14} className="animate-spin" />}
                {isPending ? 'Adding…' : 'Add & continue'}
                {!isPending && <ChevronRight size={16} strokeWidth={2} />}
              </button>
              <button
                type="button"
                onClick={handleSkip}
                disabled={isPending}
                className="px-4 h-10 rounded-[10px] text-sm text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F5F5F7] dark:hover:bg-[#27272A] transition-colors disabled:opacity-50 cursor-pointer"
              >
                Skip
              </button>
            </div>
          </form>
        )}

        {/* Step 2 — Document */}
        {step === 2 && (
          <form onSubmit={submitStep2} className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#F0FDF4] dark:bg-[#059669]/20">
                <FileText size={20} strokeWidth={1.5} className="text-[#059669] dark:text-[#34D399]" />
              </div>
              <div>
                <h1 className="text-lg font-semibold font-heading text-[#1D1D1F] dark:text-[#FAFAFA]">
                  Add a document expiry
                </h1>
                <p className="text-sm text-[#52525B] dark:text-[#A1A1AA]">Passport, licence, or insurance.</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Type selector */}
              <div>
                <label className="block text-sm font-medium text-[#1D1D1F] dark:text-[#FAFAFA] mb-2">
                  Document type
                </label>
                <div className="flex gap-2">
                  {DOC_TYPES.map((dt) => (
                    <button
                      key={dt.value}
                      type="button"
                      onClick={() => setDocType(dt.value)}
                      className={[
                        'flex-1 py-2 rounded-[10px] border text-xs font-medium transition-all duration-150 cursor-pointer',
                        docType === dt.value
                          ? 'bg-[#0369A1] dark:bg-[#38BDF8] border-transparent text-white dark:text-[#0B0C0E]'
                          : 'border-[#E4E4E7] dark:border-[#27272A] text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F5F5F7] dark:hover:bg-[#27272A]',
                      ].join(' ')}
                    >
                      {dt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="docTitle" className="block text-sm font-medium text-[#1D1D1F] dark:text-[#FAFAFA] mb-1.5">
                  Label <span className="text-red-500">*</span>
                </label>
                <input
                  id="docTitle"
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder={`e.g. ${docType === 'passport' ? 'Canadian Passport' : docType === 'license' ? 'Ontario G Licence' : 'Car Insurance'}`}
                  autoFocus
                  className="w-full h-10 rounded-[10px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] text-[#1D1D1F] dark:text-[#FAFAFA] placeholder:text-[#A1A1AA] text-sm px-3.5 outline-none focus:ring-2 focus:ring-[#0369A1] dark:focus:ring-[#38BDF8]"
                />
              </div>

              <div>
                <label htmlFor="docDate" className="block text-sm font-medium text-[#1D1D1F] dark:text-[#FAFAFA] mb-1.5">
                  Expiry date <span className="text-[#A1A1AA] font-normal">(optional)</span>
                </label>
                <input
                  id="docDate"
                  type="date"
                  value={docDate}
                  onChange={(e) => setDocDate(e.target.value)}
                  className="w-full h-10 rounded-[10px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] text-[#1D1D1F] dark:text-[#FAFAFA] text-sm px-3.5 tabular-nums outline-none focus:ring-2 focus:ring-[#0369A1] dark:focus:ring-[#38BDF8] cursor-pointer"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-[10px] bg-[#0369A1] dark:bg-[#38BDF8] text-white dark:text-[#0B0C0E] text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {isPending && <Loader2 size={14} className="animate-spin" />}
                {isPending ? 'Adding…' : 'Add & continue'}
                {!isPending && <ChevronRight size={16} strokeWidth={2} />}
              </button>
              <button
                type="button"
                onClick={handleSkip}
                disabled={isPending}
                className="px-4 h-10 rounded-[10px] text-sm text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F5F5F7] dark:hover:bg-[#27272A] transition-colors disabled:opacity-50 cursor-pointer"
              >
                Skip
              </button>
            </div>
          </form>
        )}

        {/* Step 3 — Done */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#F0FDF4] dark:bg-[#059669]/20">
                <ShieldCheck size={20} strokeWidth={1.5} className="text-[#059669] dark:text-[#34D399]" />
              </div>
              <div>
                <h1 className="text-lg font-semibold font-heading text-[#1D1D1F] dark:text-[#FAFAFA]">
                  You&apos;re all set.
                </h1>
                <p className="text-sm text-[#52525B] dark:text-[#A1A1AA]">LifeOS is watching.</p>
              </div>
            </div>

            {added.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#52525B] dark:text-[#A1A1AA]">
                  Added
                </p>
                {added.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-[10px] bg-[#F5F5F7] dark:bg-[#27272A]"
                  >
                    <CheckCircle size={16} strokeWidth={1.5} className="text-[#059669] dark:text-[#34D399] flex-none" />
                    <div>
                      <p className="text-sm font-medium text-[#1D1D1F] dark:text-[#FAFAFA]">{f.title}</p>
                      <p className="text-xs text-[#52525B] dark:text-[#A1A1AA]">{f.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-sm text-[#52525B] dark:text-[#A1A1AA]">
              LifeOS will alert you when something needs your attention. Check the dashboard — alerts may already be waiting.
            </p>

            <button
              onClick={() => router.push('/dashboard')}
              className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-[10px] bg-[#0369A1] dark:bg-[#38BDF8] text-white dark:text-[#0B0C0E] text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
            >
              Go to dashboard
              <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
