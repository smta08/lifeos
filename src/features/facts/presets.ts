// Quick-add presets, Gmail scan fixtures, and helpers that turn them into
// CreateFactInput. Pure data + date math — safe to import from client components.

import {
  Tv, Music, ShoppingCart, Cloud, Sparkles, Youtube, Film, Palette,
  Dumbbell, Box,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { FactType } from '@/domain/fact'
import type { CreateFactInput } from './schema'

export interface SubscriptionPreset {
  name: string
  amount: number   // dollars; converted to a 2-decimal string for createFact
  day: number      // day-of-month the charge recurs (1–28)
  icon: LucideIcon
  color: string    // brand tint for the identity disc (not an urgency signal)
}

export const QUICK_ADD_PRESETS: SubscriptionPreset[] = [
  { name: 'Netflix',      amount: 15.99, day: 12, icon: Tv,           color: '#E50914' },
  { name: 'Spotify',      amount: 9.99,  day: 5,  icon: Music,        color: '#1DB954' },
  { name: 'Amazon Prime', amount: 14.99, day: 20, icon: ShoppingCart, color: '#FF9900' },
  { name: 'iCloud',       amount: 2.99,  day: 1,  icon: Cloud,        color: '#3B82F6' },
  { name: 'Disney+',      amount: 7.99,  day: 15, icon: Sparkles,     color: '#6366F1' },
  { name: 'YouTube',      amount: 11.99, day: 8,  icon: Youtube,      color: '#FF0000' },
  { name: 'HBO Max',      amount: 15.99, day: 22, icon: Film,         color: '#A855F7' },
  { name: 'Adobe CC',     amount: 54.99, day: 3,  icon: Palette,      color: '#FF3366' },
  { name: 'Gym',          amount: 39.99, day: 28, icon: Dumbbell,     color: '#F59E0B' },
  { name: 'Dropbox',      amount: 11.99, day: 18, icon: Box,          color: '#2563EB' },
]

// Next future occurrence of a day-of-month, as a full ISO string (UTC offset).
// Matches createFactSchema's `dueDate: z.string().datetime({ offset: true })`.
export function nextRenewalISO(day: number, from: Date = new Date()): string {
  let d = new Date(from.getFullYear(), from.getMonth(), day)
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  if (d < today) d = new Date(from.getFullYear(), from.getMonth() + 1, day)
  return d.toISOString()
}

// Centralized CreateFactInput builder so chips, docs, and scan stay consistent.
export function makeFactInput(args: {
  type: FactType
  title: string
  amount?: number
  dueDateISO?: string
  recurrence?: CreateFactInput['recurrence']
}): CreateFactInput {
  return {
    type:       args.type,
    title:      args.title,
    amount:     args.amount !== undefined ? args.amount.toFixed(2) : undefined,
    currency:   'CAD',
    dueDate:    args.dueDateISO ?? '',
    recurrence: args.recurrence ?? 'none',
    metadata:   {},
  }
}
