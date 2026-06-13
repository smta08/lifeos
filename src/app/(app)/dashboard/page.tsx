import Link from 'next/link'
import { Plus } from 'lucide-react'
import { requireUser } from '@/services/auth/requireUser'
import { createClient } from '@/lib/supabase/server'
import { alertRepo } from '@/repositories/alertRepo'
import { factRepo } from '@/repositories/factRepo'
import { AlertList } from '@/features/alerts/components/AlertList'
import { SpendingStrip } from '@/features/facts/components/SpendingStrip'
import { QuickAddChips } from '@/features/facts/components/QuickAddChips'
import { totalMonthlySpend, renewingSoon } from '@/domain/spending'
import type { Alert, AlertJSON } from '@/domain/alert'

function greeting(timezone: string) {
  // Hour-of-day in the user's own timezone, not the server's.
  const hourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, hour: 'numeric', hour12: false,
  }).format(new Date())
  const h = parseInt(hourStr, 10) % 24
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function serializeAlert(alert: Alert): AlertJSON {
  return {
    id:              alert.id,
    userId:          alert.userId,
    dedupeKey:       alert.dedupeKey,
    category:        alert.category,
    urgency:         alert.urgency,
    title:           alert.title,
    suggestedAction: alert.suggestedAction,
    snoozedUntil:    alert.snoozedUntil?.toISOString() ?? null,
    resolvedAt:      alert.resolvedAt?.toISOString()   ?? null,
    status:          alert.status,
    source:          alert.source,
    evidenceFacts:   alert.evidenceFacts,
    createdAt:       alert.createdAt.toISOString(),
    updatedAt:       alert.updatedAt.toISOString(),
  }
}

export default async function DashboardPage() {
  const user = await requireUser()
  const supabase = await createClient()

  const [{ data: profile }, alertsResult, factsResult] = await Promise.all([
    supabase.from('profiles').select('display_name, timezone').eq('id', user.id).single(),
    alertRepo.listAlerts(user.id, { status: ['active', 'snoozed'], page: 1, pageSize: 50 }),
    factRepo.listFacts(user.id, { status: 'active', page: 1, pageSize: 100 }),
  ])

  const name     = profile?.display_name ?? user.email?.split('@')[0] ?? 'there'
  const timezone = profile?.timezone ?? 'UTC'
  const alerts = alertsResult.ok ? alertsResult.data.items : []
  const alertsJSON: AlertJSON[] = alerts.map(serializeAlert)
  const activeCount = alerts.filter((a) => a.status === 'active').length

  // Spending overview derived from active facts (pure domain math).
  const facts = factsResult.ok ? factsResult.data.items : []
  const totalMonthly   = totalMonthlySpend(facts)
  const soonCount      = renewingSoon(facts, 14)
  const existingTitles = facts.map((f) => f.title.toLowerCase())

  return (
    <div className="max-w-4xl mx-auto">
      {/* Greeting + status */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold font-heading text-[#1D1D1F] dark:text-[#FAFAFA]">
          {greeting(timezone)}, {name}.
        </h1>
        <p className="text-[#52525B] dark:text-[#A1A1AA] mt-1 text-sm">
          {activeCount === 0
            ? 'Everything looks good.'
            : `${activeCount} item${activeCount !== 1 ? 's' : ''} need${activeCount === 1 ? 's' : ''} your attention.`}
        </p>
      </div>

      {/* Spending overview */}
      <div className="mb-8 space-y-5">
        <SpendingStrip
          totalMonthly={totalMonthly}
          trackedCount={facts.length}
          soonCount={soonCount}
        />
        <div>
          <h2 className="mb-3 text-sm font-medium text-[#1D1D1F] dark:text-[#FAFAFA]">
            Quick add
            <span className="ml-2 font-normal text-[#52525B] dark:text-[#A1A1AA]">
              one tap to start tracking
            </span>
          </h2>
          <QuickAddChips existingTitles={existingTitles} />
        </div>
      </div>

      {/* Alert list (handles its own empty state) */}
      <AlertList initialAlerts={alertsJSON} />

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
