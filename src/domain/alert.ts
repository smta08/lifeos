// Pure domain type — no framework imports.

import type { Urgency } from './urgency'

export type AlertCategory = 'expiry' | 'renewal' | 'bill' | 'dispute' | 'document' | 'other'
export type AlertStatus   = 'active' | 'snoozed' | 'resolved' | 'dismissed'
export type AlertSource   = 'rule_engine' | 'ai_scan'

export interface Alert {
  id: string
  userId: string
  // Upsert key — rule-engine: 'expiry:{factId}' / 'due:{factId}' (window excluded)
  //              AI: 'ai:' + sha256(sorted_evidence + ':' + category)
  dedupeKey:      string | null
  category:       AlertCategory
  urgency:        Urgency
  title:          string
  suggestedAction: string | null
  snoozedUntil:   Date | null
  resolvedAt:     Date | null
  status:         AlertStatus
  source:         AlertSource
  evidenceFacts:  Array<{ id: string; title: string }>
  createdAt:      Date
  updatedAt:      Date
}

// Serialized form used across the server/client boundary (Server Actions → Client Components)
export interface AlertJSON {
  id: string
  userId: string
  dedupeKey:      string | null
  category:       AlertCategory
  urgency:        Urgency
  title:          string
  suggestedAction: string | null
  snoozedUntil:   string | null
  resolvedAt:     string | null
  status:         AlertStatus
  source:         AlertSource
  evidenceFacts:  Array<{ id: string; title: string }>
  createdAt:      string
  updatedAt:      string
}
