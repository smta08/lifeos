import {
  RefreshCcw, FileText, Shield, ShieldCheck, Home, BadgeCheck,
  BookOpen, Receipt, CreditCard, CheckSquare, Target, Bookmark,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { FactType } from '@/domain/fact'

export interface FactTypeConfig {
  label: string
  icon: LucideIcon
  badgeBg: string
  badgeText: string
  // Types that typically have an amount/currency
  hasAmount: boolean
  // Types that typically have a due/expiry date
  hasDueDate: boolean
  // Types that support recurrence
  hasRecurrence: boolean
}

export const FACT_TYPE_CONFIG: Record<FactType, FactTypeConfig> = {
  subscription: {
    label: 'Subscription', icon: RefreshCcw,
    badgeBg: 'bg-blue-100 dark:bg-blue-950/50', badgeText: 'text-blue-700 dark:text-blue-300',
    hasAmount: true, hasDueDate: true, hasRecurrence: true,
  },
  document: {
    label: 'Document', icon: FileText,
    badgeBg: 'bg-purple-100 dark:bg-purple-950/50', badgeText: 'text-purple-700 dark:text-purple-300',
    hasAmount: false, hasDueDate: true, hasRecurrence: false,
  },
  insurance: {
    label: 'Insurance', icon: Shield,
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/50', badgeText: 'text-emerald-700 dark:text-emerald-300',
    hasAmount: true, hasDueDate: true, hasRecurrence: true,
  },
  warranty: {
    label: 'Warranty', icon: ShieldCheck,
    badgeBg: 'bg-yellow-100 dark:bg-yellow-950/50', badgeText: 'text-yellow-700 dark:text-yellow-300',
    hasAmount: true, hasDueDate: true, hasRecurrence: false,
  },
  lease: {
    label: 'Lease', icon: Home,
    badgeBg: 'bg-indigo-100 dark:bg-indigo-950/50', badgeText: 'text-indigo-700 dark:text-indigo-300',
    hasAmount: true, hasDueDate: true, hasRecurrence: true,
  },
  license: {
    label: 'License', icon: BadgeCheck,
    badgeBg: 'bg-pink-100 dark:bg-pink-950/50', badgeText: 'text-pink-700 dark:text-pink-300',
    hasAmount: false, hasDueDate: true, hasRecurrence: false,
  },
  passport: {
    label: 'Passport', icon: BookOpen,
    badgeBg: 'bg-red-100 dark:bg-red-950/50', badgeText: 'text-red-700 dark:text-red-300',
    hasAmount: false, hasDueDate: true, hasRecurrence: false,
  },
  receipt: {
    label: 'Receipt', icon: Receipt,
    badgeBg: 'bg-zinc-100 dark:bg-zinc-800/50', badgeText: 'text-zinc-600 dark:text-zinc-400',
    hasAmount: true, hasDueDate: false, hasRecurrence: false,
  },
  bill: {
    label: 'Bill', icon: CreditCard,
    badgeBg: 'bg-orange-100 dark:bg-orange-950/50', badgeText: 'text-orange-700 dark:text-orange-300',
    hasAmount: true, hasDueDate: true, hasRecurrence: true,
  },
  task: {
    label: 'Task', icon: CheckSquare,
    badgeBg: 'bg-cyan-100 dark:bg-cyan-950/50', badgeText: 'text-cyan-700 dark:text-cyan-300',
    hasAmount: false, hasDueDate: true, hasRecurrence: false,
  },
  goal: {
    label: 'Goal', icon: Target,
    badgeBg: 'bg-teal-100 dark:bg-teal-950/50', badgeText: 'text-teal-700 dark:text-teal-300',
    hasAmount: false, hasDueDate: true, hasRecurrence: false,
  },
  custom: {
    label: 'Custom', icon: Bookmark,
    badgeBg: 'bg-zinc-100 dark:bg-zinc-800/50', badgeText: 'text-zinc-600 dark:text-zinc-400',
    hasAmount: true, hasDueDate: true, hasRecurrence: true,
  },
}

// Urgency by days until due
export function getDueDateUrgency(dueDate: Date | null): 'critical' | 'high' | 'medium' | 'low' | null {
  if (!dueDate) return null
  const days = Math.ceil((dueDate.getTime() - Date.now()) / 86_400_000)
  if (days <= 1)  return 'critical'
  if (days <= 7)  return 'high'
  if (days <= 30) return 'medium'
  return 'low'
}

export const URGENCY_CLASSES = {
  critical: 'text-red-600 dark:text-red-400',
  high:     'text-orange-600 dark:text-orange-400',
  medium:   'text-amber-500 dark:text-amber-400',
  low:      'text-zinc-400',
}
