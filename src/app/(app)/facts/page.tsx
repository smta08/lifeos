import Link from 'next/link'
import { Plus, Archive } from 'lucide-react'
import { listFacts } from '@/features/facts/actions'
import { FactCard } from '@/features/facts/components/FactCard'
import { FactFilters } from './_components/FactFilters'
import type { FactType } from '@/domain/fact'

interface PageProps {
  searchParams: {
    q?: string
    type?: string
    status?: string
    page?: string
  }
}

export default async function FactsPage({ searchParams }: PageProps) {
  const result = await listFacts({
    query:    searchParams.q,
    type:     searchParams.type as FactType | undefined,
    status:   (searchParams.status as 'active' | 'archived') ?? 'active',
    page:     searchParams.page ? parseInt(searchParams.page, 10) : 1,
    pageSize: 24,
  })

  const facts = result.ok ? result.data.items : []
  const nextCursor = result.ok ? result.data.nextCursor : null

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold font-heading text-[#1D1D1F] dark:text-[#FAFAFA]">
            Memory
          </h1>
          <p className="text-sm text-[#52525B] dark:text-[#A1A1AA] mt-0.5">
            Everything LifeOS is tracking for you.
          </p>
        </div>
        <Link
          href="/facts/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#0369A1] dark:bg-[#38BDF8] text-white dark:text-[#0B0C0E] text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
        >
          <Plus size={16} strokeWidth={2} />
          Add fact
        </Link>
      </div>

      {/* Filters */}
      <FactFilters
        currentType={searchParams.type}
        currentStatus={searchParams.status ?? 'active'}
        currentQuery={searchParams.q}
      />

      {/* Grid */}
      {facts.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {facts.map((fact) => (
              <FactCard key={fact.id} fact={fact} />
            ))}
          </div>

          {/* Pagination */}
          {nextCursor && (
            <div className="mt-8 flex justify-center">
              <Link
                href={`?${new URLSearchParams({ ...searchParams, page: nextCursor }).toString()}`}
                className="px-4 py-2 rounded-[10px] border border-[#E4E4E7] dark:border-[#27272A] text-sm text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F5F5F7] dark:hover:bg-[#27272A] transition-colors"
              >
                Load more
              </Link>
            </div>
          )}
        </>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 text-center mt-6">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[#E4E4E7] dark:bg-[#27272A] mb-4">
            <Archive size={24} strokeWidth={1.5} className="text-[#52525B] dark:text-[#A1A1AA]" />
          </div>
          <p className="text-base font-medium text-[#1D1D1F] dark:text-[#FAFAFA] mb-1">
            {searchParams.q || searchParams.type
              ? 'No facts match your filters.'
              : 'Add your first fact to get started.'}
          </p>
          {!searchParams.q && !searchParams.type && (
            <p className="text-sm text-[#52525B] dark:text-[#A1A1AA]">
              Track subscriptions, documents, bills, and more.
            </p>
          )}
        </div>
      )}

      {/* FAB */}
      <Link
        href="/facts/new"
        aria-label="Add new fact"
        className="fixed bottom-6 right-6 flex items-center justify-center w-14 h-14 rounded-full bg-[#0369A1] dark:bg-[#38BDF8] text-white dark:text-[#0B0C0E] shadow-lg hover:opacity-90 transition-opacity z-10 cursor-pointer"
      >
        <Plus size={24} strokeWidth={2} />
      </Link>
    </div>
  )
}
