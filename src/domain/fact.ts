// Pure domain type — no framework imports.

export type FactType =
  | 'subscription'
  | 'document'
  | 'insurance'
  | 'warranty'
  | 'lease'
  | 'license'
  | 'passport'
  | 'receipt'
  | 'bill'
  | 'task'
  | 'goal'
  | 'custom'

export type Recurrence = 'none' | 'weekly' | 'monthly' | 'yearly'
export type FactStatus = 'active' | 'archived' | 'resolved'
export type FactSource = 'manual' | 'email' | 'ocr' | 'api'

export interface Fact {
  id: string
  userId: string
  type: FactType
  title: string
  category: string | null
  // Stored as decimal string for precision; null when not applicable
  amount: string | null
  currency: string | null
  // due_date always means the NEXT occurrence; engine advances it when it passes
  dueDate: Date | null
  recurrence: Recurrence
  status: FactStatus
  source: FactSource
  // Indexed, non-sensitive metadata only — sensitive values go in the encrypted `sensitive` column
  metadata: Record<string, unknown>
  // Provenance — null for manual Phase 1 facts
  connectionId: string | null
  externalRef: string | null
  createdAt: Date
  updatedAt: Date
}
