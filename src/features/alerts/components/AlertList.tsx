'use client'

import { useOptimistic, useTransition } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { AlertCard } from './AlertCard'
import { dismissAlert, snoozeAlert, resolveAlert } from '@/features/alerts/actions'
import type { AlertJSON } from '@/domain/alert'
import type { Urgency } from '@/domain/urgency'

const URGENCY_ORDER: Urgency[] = ['critical', 'high', 'medium', 'low']

const SECTION_LABEL: Record<Urgency, string> = {
  critical: 'Critical',
  high:     'High priority',
  medium:   'Medium priority',
  low:      'Low priority',
}

interface Props {
  initialAlerts: AlertJSON[]
}

export function AlertList({ initialAlerts }: Props) {
  const [isPending, startTransition] = useTransition()
  const [alerts, removeAlert] = useOptimistic(
    initialAlerts,
    (state: AlertJSON[], id: string) => state.filter((a) => a.id !== id),
  )

  const activeAlerts  = alerts.filter((a) => a.status === 'active')
  const snoozedAlerts = alerts.filter((a) => a.status === 'snoozed')

  function handleDismiss(id: string) {
    startTransition(async () => {
      removeAlert(id)
      await dismissAlert({ id })
    })
  }

  function handleSnooze(id: string, until: string) {
    startTransition(async () => {
      removeAlert(id)
      await snoozeAlert({ id, until })
    })
  }

  function handleResolve(id: string) {
    startTransition(async () => {
      removeAlert(id)
      await resolveAlert({ id })
    })
  }

  if (activeAlerts.length === 0 && snoozedAlerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[#E4E4E7] dark:bg-[#27272A] mb-5">
          <ShieldCheck size={28} strokeWidth={1.5} className="text-[#52525B] dark:text-[#A1A1AA]" />
        </div>
        <h2 className="text-lg font-medium font-heading text-[#1D1D1F] dark:text-[#FAFAFA] mb-2">
          Nothing needs you right now.
        </h2>
        <p className="text-sm text-[#52525B] dark:text-[#A1A1AA] max-w-xs leading-relaxed">
          Add facts — subscriptions, documents, bills — and LifeOS will surface what needs your attention.
        </p>
        <Link
          href="/facts/new"
          className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#0369A1] dark:bg-[#38BDF8] text-white dark:text-[#0B0C0E] text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Add your first fact
        </Link>
      </div>
    )
  }

  // Group active alerts by urgency
  const grouped = URGENCY_ORDER.map((urgency) => ({
    urgency,
    items: activeAlerts.filter((a) => a.urgency === urgency),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="space-y-8">
      <AnimatePresence initial={false}>
        {grouped.map(({ urgency, items }) => (
          <section key={urgency}>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#52525B] dark:text-[#A1A1AA] mb-3">
              {SECTION_LABEL[urgency]}
            </h2>
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {items.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    isPending={isPending}
                    onDismiss={() => handleDismiss(alert.id)}
                    onSnooze={(until) => handleSnooze(alert.id, until)}
                    onResolve={() => handleResolve(alert.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </section>
        ))}

        {/* Snoozed section */}
        {snoozedAlerts.length > 0 && (
          <section key="snoozed">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#52525B] dark:text-[#A1A1AA] mb-3">
              Snoozed
            </h2>
            <div className="space-y-3 opacity-60">
              <AnimatePresence initial={false}>
                {snoozedAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    isPending={isPending}
                    onDismiss={() => handleDismiss(alert.id)}
                    onSnooze={(until) => handleSnooze(alert.id, until)}
                    onResolve={() => handleResolve(alert.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}
      </AnimatePresence>
    </div>
  )
}
