import Link from 'next/link'
import {
  Plus, Pencil, Archive, X, Clock, CheckCircle, Activity,
} from 'lucide-react'
import { requireUser } from '@/services/auth/requireUser'
import { activityRepo } from '@/repositories/activityRepo'

const ACTION_ICON: Record<string, React.ElementType> = {
  'fact.created':    Plus,
  'fact.updated':    Pencil,
  'fact.archived':   Archive,
  'alert.dismissed': X,
  'alert.snoozed':   Clock,
  'alert.resolved':  CheckCircle,
  'profile.updated': Activity,
}

const ACTION_LABEL: Record<string, string> = {
  'fact.created':    'Added a fact',
  'fact.updated':    'Updated a fact',
  'fact.archived':   'Archived a fact',
  'alert.dismissed': 'Dismissed an alert',
  'alert.snoozed':   'Snoozed an alert',
  'alert.resolved':  'Resolved an alert',
  'profile.updated': 'Updated profile',
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7)   return `${days}d ago`
  return new Date(isoString).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

interface PageProps {
  searchParams: { page?: string }
}

export default async function ActivityPage({ searchParams }: PageProps) {
  const user   = await requireUser()
  const cursor = searchParams.page
  const result = await activityRepo.list(user.id, cursor)

  const entries    = result.ok ? result.data.items : []
  const nextCursor = result.ok ? result.data.nextCursor : null
  const page       = cursor ? parseInt(cursor, 10) : 1

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold font-heading text-[#1D1D1F] dark:text-[#FAFAFA]">
          Activity
        </h1>
        <p className="text-sm text-[#52525B] dark:text-[#A1A1AA] mt-0.5">
          Everything you&apos;ve done in LifeOS.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[#E4E4E7] dark:bg-[#27272A] mb-4">
            <Activity size={24} strokeWidth={1.5} className="text-[#52525B] dark:text-[#A1A1AA]" />
          </div>
          <p className="text-base font-medium text-[#1D1D1F] dark:text-[#FAFAFA] mb-1">
            Your activity will appear here.
          </p>
          <p className="text-sm text-[#52525B] dark:text-[#A1A1AA]">
            Start by adding a fact.
          </p>
        </div>
      ) : (
        <>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-[#E4E4E7] dark:bg-[#27272A]" />

            <ul className="space-y-0">
              {entries.map((entry) => {
                const Icon  = ACTION_ICON[entry.action] ?? Activity
                const label = ACTION_LABEL[entry.action] ?? entry.action

                const metaTitle = entry.metadata && typeof entry.metadata === 'object'
                  ? (entry.metadata as Record<string, unknown>).title as string | undefined
                  : undefined

                return (
                  <li key={entry.id} className="relative flex gap-4 pb-6">
                    {/* Icon bubble */}
                    <div className="flex-none relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#27272A]">
                      <Icon size={16} strokeWidth={1.5} className="text-[#52525B] dark:text-[#A1A1AA]" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-2">
                      <p className="text-sm font-medium text-[#1D1D1F] dark:text-[#FAFAFA] leading-snug">
                        {label}
                        {metaTitle && (
                          <span className="font-normal text-[#52525B] dark:text-[#A1A1AA]">
                            {' '}— {metaTitle}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-[#A1A1AA] mt-0.5 tabular-nums">
                        {timeAgo(entry.createdAt)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Pagination */}
          <div className="flex items-center gap-3 mt-2">
            {page > 1 && (
              <Link
                href={`?page=${page - 1}`}
                className="px-4 py-2 rounded-[10px] border border-[#E4E4E7] dark:border-[#27272A] text-sm text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F5F5F7] dark:hover:bg-[#27272A] transition-colors"
              >
                Previous
              </Link>
            )}
            {nextCursor && (
              <Link
                href={`?page=${nextCursor}`}
                className="px-4 py-2 rounded-[10px] border border-[#E4E4E7] dark:border-[#27272A] text-sm text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F5F5F7] dark:hover:bg-[#27272A] transition-colors"
              >
                Load more
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  )
}
