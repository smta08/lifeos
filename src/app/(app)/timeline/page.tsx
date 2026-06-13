import { CalendarClock } from 'lucide-react'
import { requireUser } from '@/services/auth/requireUser'
import { factRepo } from '@/repositories/factRepo'
import { monthlyAmount } from '@/domain/spending'
import { Reveal } from '@/components/motion/Reveal'
import type { Fact, FactType } from '@/domain/fact'

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

// Calm, restrained per-type dot colors — identity only, never an urgency signal.
const TYPE_DOT: Partial<Record<FactType, string>> = {
  subscription: '#0369A1',
  bill:         '#EA580C',
  insurance:    '#059669',
  warranty:     '#CA8A04',
  lease:        '#4F46E5',
  license:      '#DB2777',
  passport:     '#DC2626',
  document:     '#7C3AED',
}
const DEFAULT_DOT = '#52525B'

function formatAmount(amount: string | null, currency: string | null) {
  if (!amount) return null
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: currency ?? 'CAD',
    minimumFractionDigits: 2,
  }).format(parseFloat(amount))
}

export default async function TimelinePage() {
  const user = await requireUser()
  const result = await factRepo.listFacts(user.id, { status: 'active', page: 1, pageSize: 100 })
  const facts: Fact[] = result.ok ? result.data.items : []
  const dated = facts.filter((f) => f.dueDate)

  const now = new Date()
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold font-heading text-[#1D1D1F] dark:text-[#FAFAFA]">
          Timeline
        </h1>
        <p className="mt-0.5 text-sm text-[#52525B] dark:text-[#A1A1AA]">
          When everything renews over the next 12 months.
        </p>
      </div>

      {dated.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-card border border-dashed border-[#E4E4E7] dark:border-[#27272A] py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E4E4E7] dark:bg-[#27272A]">
            <CalendarClock size={24} strokeWidth={1.5} className="text-[#52525B] dark:text-[#A1A1AA]" />
          </div>
          <p className="mb-1 text-base font-medium text-[#1D1D1F] dark:text-[#FAFAFA]">
            Your timeline is clear.
          </p>
          <p className="text-sm text-[#52525B] dark:text-[#A1A1AA]">
            Add subscriptions or documents with dates to see them mapped across the year.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {months.map(({ year, month }, i) => {
            const items = dated
              .filter((f) => f.dueDate!.getFullYear() === year && f.dueDate!.getMonth() === month)
              .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
            const has = items.length > 0
            const monthTotal = items.reduce((s, f) => s + monthlyAmount(f), 0)

            return (
              <Reveal key={`${year}-${month}`} delay={Math.min(i * 0.04, 0.4)}>
              <div
                className={[
                  'rounded-card border p-4 transition-all duration-150',
                  has
                    ? 'border-[#0369A1]/30 dark:border-[#38BDF8]/30 bg-white dark:bg-[#18181B] shadow-card hover:-translate-y-0.5'
                    : 'border-[#E4E4E7] dark:border-[#27272A] bg-transparent',
                ].join(' ')}
              >
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#FAFAFA]">
                    {MONTHS_LONG[month]}{' '}
                    <span className="font-normal text-[#52525B] dark:text-[#A1A1AA]">{year}</span>
                  </h2>
                  {has && monthTotal > 0 && (
                    <span className="text-xs font-medium tabular-nums text-[#0369A1] dark:text-[#38BDF8]">
                      ${monthTotal.toFixed(2)}/mo
                    </span>
                  )}
                </div>

                {has ? (
                  <ul className="space-y-2">
                    {items.map((f) => {
                      const amount = formatAmount(f.amount, f.currency)
                      return (
                        <li key={f.id} className="flex items-center gap-2.5 text-sm">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: TYPE_DOT[f.type] ?? DEFAULT_DOT }}
                          />
                          <span className="flex-1 truncate text-[#1D1D1F] dark:text-[#FAFAFA]">
                            {f.title}
                          </span>
                          <span className="text-xs tabular-nums text-[#52525B] dark:text-[#A1A1AA]">
                            {MONTHS_SHORT[f.dueDate!.getMonth()]} {f.dueDate!.getDate()}
                          </span>
                          {amount && (
                            <span className="w-16 text-right text-xs font-medium tabular-nums text-[#1D1D1F] dark:text-[#FAFAFA]">
                              {amount}
                            </span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-[#A1A1AA] dark:text-[#52525B]">Nothing scheduled</p>
                )}
              </div>
              </Reveal>
            )
          })}
        </div>
      )}
    </div>
  )
}
