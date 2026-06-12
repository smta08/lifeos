'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { FACT_TYPE_CONFIG } from '@/features/facts/constants'
import type { FactType } from '@/domain/fact'

interface FactFiltersProps {
  currentType?: string
  currentStatus: string
  currentQuery?: string
}

const TYPE_OPTIONS = Object.entries(FACT_TYPE_CONFIG) as [FactType, typeof FACT_TYPE_CONFIG[FactType]][]

export function FactFilters({ currentType, currentStatus, currentQuery }: FactFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setParam = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page') // reset to page 1 on filter change
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams],
  )

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          strokeWidth={1.5}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] pointer-events-none"
        />
        <input
          type="search"
          value={currentQuery ?? ''}
          onChange={(e) => setParam('q', e.target.value || undefined)}
          placeholder="Search facts…"
          className="w-full h-10 pl-9 pr-4 rounded-[10px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] text-[#1D1D1F] dark:text-[#FAFAFA] placeholder:text-[#A1A1AA] text-sm outline-none focus:ring-2 focus:ring-[#0369A1] dark:focus:ring-[#38BDF8]"
        />
      </div>

      {/* Type chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setParam('type', undefined)}
          className={[
            'px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer',
            !currentType
              ? 'bg-[#0369A1] dark:bg-[#38BDF8] text-white dark:text-[#0B0C0E]'
              : 'bg-[#F5F5F7] dark:bg-[#27272A] text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#E4E4E7] dark:hover:bg-zinc-700',
          ].join(' ')}
        >
          All
        </button>

        {TYPE_OPTIONS.map(([type, config]) => {
          const Icon = config.icon
          const isActive = currentType === type
          return (
            <button
              key={type}
              type="button"
              onClick={() => setParam('type', isActive ? undefined : type)}
              className={[
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer',
                isActive
                  ? `${config.badgeBg} ${config.badgeText} ring-1 ring-current`
                  : 'bg-[#F5F5F7] dark:bg-[#27272A] text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#E4E4E7] dark:hover:bg-zinc-700',
              ].join(' ')}
            >
              <Icon size={11} strokeWidth={2} />
              {config.label}
              {isActive && <X size={10} strokeWidth={2} />}
            </button>
          )
        })}
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1">
        {(['active', 'archived'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setParam('status', s)}
            className={[
              'px-3 py-1 rounded-[8px] text-xs font-medium capitalize transition-colors cursor-pointer',
              currentStatus === s
                ? 'bg-[#E4E4E7] dark:bg-[#27272A] text-[#1D1D1F] dark:text-[#FAFAFA]'
                : 'text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F5F5F7] dark:hover:bg-[#27272A]',
            ].join(' ')}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
