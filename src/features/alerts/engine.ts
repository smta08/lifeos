// Deterministic Phase 1 alert engine — date math only, no AI, no external calls.
// Engine date math runs in profiles.timezone.
// Scans status='active' facts only; archiving a fact resolves its alerts.

import type { Fact, FactType } from '@/domain/fact'
import type { AlertCategory } from '@/domain/alert'
import type { Urgency } from '@/domain/urgency'

export interface AlertSpec {
  dedupeKey:      string
  title:          string
  category:       AlertCategory
  urgency:        Urgency
  suggestedAction: string | null
  evidenceFactId: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dueDate: Date, now: Date, timezone: string): number {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
  })

  const todayParts = fmt.formatToParts(now)
  const todayStr = `${todayParts.find(p => p.type === 'year')!.value}-${todayParts.find(p => p.type === 'month')!.value}-${todayParts.find(p => p.type === 'day')!.value}`

  const dueParts = fmt.formatToParts(dueDate)
  const dueStr = `${dueParts.find(p => p.type === 'year')!.value}-${dueParts.find(p => p.type === 'month')!.value}-${dueParts.find(p => p.type === 'day')!.value}`

  const msPerDay = 86_400_000
  return Math.round((new Date(dueStr).getTime() - new Date(todayStr).getTime()) / msPerDay)
}

// ─── Rule sets ────────────────────────────────────────────────────────────────

const EXPIRY_TYPES: FactType[] = [
  'passport', 'license', 'document', 'insurance', 'lease', 'warranty',
]

const PAYMENT_TYPES: FactType[] = ['subscription', 'bill']

// ─── Engine ───────────────────────────────────────────────────────────────────

export function computeAlerts(
  facts: Fact[],
  timezone: string,
  now: Date,
): AlertSpec[] {
  const alerts: AlertSpec[] = []
  const activeFacts = facts.filter(f => f.status === 'active')

  for (const fact of activeFacts) {
    if (!fact.dueDate) continue

    const days = daysUntil(fact.dueDate, now, timezone)

    // ── Expiry rules (passport, license, document, insurance, lease, warranty) ──
    if (EXPIRY_TYPES.includes(fact.type)) {
      if (days <= 7) {
        alerts.push({
          // Stable key per fact (NOT per window) — one alert updates its
          // urgency/title as the window narrows, preserving snooze + identity.
          dedupeKey:      `expiry:${fact.id}`,
          title:          days <= 0
            ? `${fact.title} has expired`
            : `${fact.title} expires in ${days} day${days !== 1 ? 's' : ''}`,
          category:       'expiry',
          urgency:        'critical',
          suggestedAction: 'Renew as soon as possible.',
          evidenceFactId: fact.id,
        })
      } else if (days <= 30) {
        alerts.push({
          dedupeKey:      `expiry:${fact.id}`,
          title:          `${fact.title} expires in ${days} days`,
          category:       'expiry',
          urgency:        'high',
          suggestedAction: 'Schedule renewal before the deadline.',
          evidenceFactId: fact.id,
        })
      } else if (days <= 90) {
        alerts.push({
          dedupeKey:      `expiry:${fact.id}`,
          title:          `${fact.title} expires in ${days} days`,
          category:       'expiry',
          urgency:        'medium',
          suggestedAction: 'Mark your calendar to renew within the next 30 days.',
          evidenceFactId: fact.id,
        })
      }
    }

    // ── Payment due rules (subscription, bill) ──
    if (PAYMENT_TYPES.includes(fact.type) && days >= 0 && days <= 7) {
      alerts.push({
        dedupeKey:      `due:${fact.id}`,
        title:          days === 0
          ? `${fact.title} is due today`
          : `${fact.title} due in ${days} day${days !== 1 ? 's' : ''}`,
        category:       'renewal',
        urgency:        'medium',
        suggestedAction: null,
        evidenceFactId: fact.id,
      })
    }
  }

  // ── Duplicate subscription detection ──
  const subs = activeFacts.filter(f => f.type === 'subscription')
  const byTitle = new Map<string, Fact[]>()
  for (const s of subs) {
    const key = s.title.toLowerCase().trim()
    byTitle.set(key, [...(byTitle.get(key) ?? []), s])
  }
  for (const dupes of Array.from(byTitle.values())) {
    if (dupes.length >= 2) {
      const sortedIds = dupes.map((f: Fact) => f.id).sort().join(':')
      alerts.push({
        dedupeKey:      `duplicate:${sortedIds}`,
        title:          `Possible duplicate subscription: "${dupes[0].title}"`,
        category:       'bill',
        urgency:        'low',
        suggestedAction: 'Review whether you need both subscriptions.',
        evidenceFactId: dupes[0].id,
      })
    }
  }

  return alerts
}

// ─── Stale-alert resolution ───────────────────────────────────────────────────

/**
 * Returns the dedupe keys that are still valid for the current facts set.
 * Alerts whose keys are absent should be resolved.
 */
export function activeDedupeKeys(specs: AlertSpec[]): Set<string> {
  return new Set(specs.map(s => s.dedupeKey))
}
