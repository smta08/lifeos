// Pure domain — spending math over facts. No framework imports.

import type { Fact, Recurrence } from './fact'

// Average weeks per month, used to normalize weekly costs to a monthly figure.
const WEEKS_PER_MONTH = 4.345

// Normalize a single fact's amount to a monthly figure.
// Facts with no amount, or non-recurring amounts, contribute 0 to monthly spend.
export function monthlyAmount(fact: Pick<Fact, 'amount' | 'recurrence'>): number {
  if (!fact.amount) return 0
  const value = parseFloat(fact.amount)
  if (Number.isNaN(value)) return 0

  const perMonth: Record<Recurrence, number> = {
    none:    0,                       // one-off — not part of recurring monthly spend
    weekly:  value * WEEKS_PER_MONTH,
    monthly: value,
    yearly:  value / 12,
  }
  return perMonth[fact.recurrence]
}

export function totalMonthlySpend(facts: Pick<Fact, 'amount' | 'recurrence'>[]): number {
  return facts.reduce((sum, f) => sum + monthlyAmount(f), 0)
}

// Whole days from now until `date` (negative = overdue). Calendar-day based,
// so "today" is 0 regardless of the time-of-day component.
export function daysUntil(date: Date, now: Date = new Date()): number {
  const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const b = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.round((b - a) / 86_400_000)
}

// Count of facts renewing within `withinDays` (inclusive), not yet overdue.
export function renewingSoon(
  facts: Pick<Fact, 'dueDate'>[],
  withinDays = 14,
  now: Date = new Date(),
): number {
  return facts.filter((f) => {
    if (!f.dueDate) return false
    const d = daysUntil(f.dueDate, now)
    return d >= 0 && d <= withinDays
  }).length
}

// Renewal-reminder urgency for a due date. Thresholds chosen for subscriptions:
// ≤3 days = red, ≤14 days = amber, otherwise calm. null when there is no date.
export type RenewalUrgency = 'critical' | 'soon' | 'calm'

export function renewalUrgency(date: Date | null, now: Date = new Date()): RenewalUrgency | null {
  if (!date) return null
  const d = daysUntil(date, now)
  if (d <= 3) return 'critical'
  if (d <= 14) return 'soon'
  return 'calm'
}
