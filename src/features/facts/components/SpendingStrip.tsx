'use client'

import { Wallet, Bell } from 'lucide-react'
import { useCountUp } from '@/lib/hooks/useCountUp'

interface SpendingStripProps {
  totalMonthly: number
  trackedCount: number
  soonCount: number
  budget?: number
}

export function SpendingStrip({
  totalMonthly,
  trackedCount,
  soonCount,
  budget = 300,
}: SpendingStripProps) {
  const animTotal = useCountUp(totalMonthly)
  const animCount = useCountUp(trackedCount, 600)
  const animSoon = useCountUp(soonCount, 600)

  const pct = budget > 0 ? Math.min((totalMonthly / budget) * 100, 100) : 0
  const over = totalMonthly > budget

  return (
    <section
      className="rounded-card border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] p-6 shadow-card"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#52525B] dark:text-[#A1A1AA]">
            Monthly spend
          </p>
          <p className="mt-1 text-3xl font-semibold font-heading tabular-nums text-[#1D1D1F] dark:text-[#FAFAFA]">
            ${animTotal.toFixed(2)}
          </p>
        </div>

        <div className="flex gap-7">
          <Stat label="Tracked" value={Math.round(animCount)} icon={Wallet} />
          <Stat label="Renewing soon" value={Math.round(animSoon)} icon={Bell} accent={soonCount > 0} />
        </div>
      </div>

      {/* Budget bar */}
      <div className="mt-5">
        <div className="mb-1.5 flex justify-between text-xs text-[#52525B] dark:text-[#A1A1AA]">
          <span className="tabular-nums">$0</span>
          <span className={over ? 'font-medium text-red-600 dark:text-red-400 tabular-nums' : 'tabular-nums'}>
            {over ? `$${(totalMonthly - budget).toFixed(0)} over $${budget} budget` : `Budget $${budget}`}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-[#F5F5F7] dark:bg-[#27272A]">
          <div
            className={[
              'h-full rounded-full transition-[width] duration-700 ease-out',
              over ? 'bg-red-600 dark:bg-red-500' : 'bg-[#0369A1] dark:bg-[#38BDF8]',
            ].join(' ')}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </section>
  )
}

function Stat({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: number
  icon: typeof Wallet
  accent?: boolean
}) {
  return (
    <div className="text-right">
      <p className="flex items-center justify-end gap-1 text-xs uppercase tracking-wider text-[#52525B] dark:text-[#A1A1AA]">
        <Icon size={12} strokeWidth={1.5} /> {label}
      </p>
      <p
        className={[
          'mt-1 text-2xl font-semibold font-heading tabular-nums',
          accent ? 'text-amber-600 dark:text-amber-400' : 'text-[#1D1D1F] dark:text-[#FAFAFA]',
        ].join(' ')}
      >
        {value}
      </p>
    </div>
  )
}
