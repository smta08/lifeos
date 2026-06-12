// Pure domain type — no framework imports.

export type Urgency = 'low' | 'medium' | 'high' | 'critical'

// Urgency scale visual mapping (dots + pills only — never full-card fills, never pulsing):
// low → zinc-400 · medium → amber-500 · high → orange-600 · critical → red-600
export const URGENCY_COLOR: Record<Urgency, string> = {
  low: 'zinc-400',
  medium: 'amber-500',
  high: 'orange-600',
  critical: 'red-600',
}
