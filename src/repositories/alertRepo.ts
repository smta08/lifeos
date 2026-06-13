// All reads/writes use the Supabase client under the user's JWT so RLS is enforced by construction.
// The rule-engine upsert (check-then-insert/update) lives in the recompute Inngest function,
// which runs under the service role; user-path code only reads and changes alert status.

import { createClient } from '@/lib/supabase/server'
import { toResultError } from '@/lib/errors'
import type { Alert, AlertStatus, AlertCategory, AlertSource } from '@/domain/alert'
import type { Urgency } from '@/domain/urgency'
import type { Result, PaginatedResult } from '@/lib/types'
import type { ListAlertsInput } from '@/features/alerts/schema'

const URGENCY_ORDER: Record<Urgency, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
}

// ─── Row → Domain mapper ──────────────────────────────────────────────────────

interface AlertRow {
  id: string
  user_id: string
  dedupe_key: string | null
  category: string
  urgency: string
  title: string
  suggested_action: string | null
  snoozed_until: string | null
  resolved_at: string | null
  status: string
  source: string
  created_at: string
  updated_at: string
  alert_evidence: Array<{
    fact_id: string
    facts: { id: string; title: string } | null
  }>
}

function rowToAlert(row: AlertRow): Alert {
  return {
    id:              row.id,
    userId:          row.user_id,
    dedupeKey:       row.dedupe_key,
    category:        row.category        as AlertCategory,
    urgency:         row.urgency         as Urgency,
    title:           row.title,
    suggestedAction: row.suggested_action,
    snoozedUntil:    row.snoozed_until  ? new Date(row.snoozed_until) : null,
    resolvedAt:      row.resolved_at    ? new Date(row.resolved_at)   : null,
    status:          row.status          as AlertStatus,
    source:          row.source          as AlertSource,
    evidenceFacts:   row.alert_evidence
      .map(e => e.facts)
      .filter((f): f is { id: string; title: string } => f !== null),
    createdAt:       new Date(row.created_at),
    updatedAt:       new Date(row.updated_at),
  }
}

// ─── Repository ───────────────────────────────────────────────────────────────

export const alertRepo = {
  async listAlerts(userId: string, filters: ListAlertsInput): Promise<PaginatedResult<Alert>> {
    const supabase = await createClient()
    const { status, page, pageSize } = filters

    const { data, error, count } = await supabase
      .from('alerts')
      .select('*, alert_evidence(fact_id, facts(id, title))', { count: 'exact' })
      .eq('user_id', userId)
      .in('status', status)
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1)

    if (error) return toResultError('INTERNAL_ERROR', 'Failed to load alerts')

    const items = (data as unknown as AlertRow[] ?? [])
      .map(rowToAlert)
      .sort((a, b) => {
        const diff = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]
        return diff !== 0 ? diff : b.createdAt.getTime() - a.createdAt.getTime()
      })

    const hasMore = page * pageSize < (count ?? 0)
    return { ok: true, data: { items, nextCursor: hasMore ? String(page + 1) : null } }
  },

  async updateAlertStatus(
    userId: string,
    id: string,
    status: AlertStatus,
    extra?: { snoozedUntil?: Date; resolvedAt?: Date },
  ): Promise<Result<void>> {
    const supabase = await createClient()

    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
    if (extra?.snoozedUntil) patch.snoozed_until = extra.snoozedUntil.toISOString()
    if (extra?.resolvedAt)   patch.resolved_at   = extra.resolvedAt.toISOString()

    const { error } = await supabase
      .from('alerts')
      .update(patch)
      .eq('id', id)
      .eq('user_id', userId)

    if (error) return toResultError('INTERNAL_ERROR', 'Failed to update alert')
    return { ok: true, data: undefined }
  },

  // Called when a fact is archived — immediately resolves its linked alerts.
  async resolveAlertsForFact(userId: string, factId: string): Promise<Result<void>> {
    const supabase = await createClient()

    const { data: evidence, error: evidErr } = await supabase
      .from('alert_evidence')
      .select('alert_id')
      .eq('fact_id', factId)

    if (evidErr) return toResultError('INTERNAL_ERROR', 'Failed to look up alert evidence')
    if (!evidence || evidence.length === 0) return { ok: true, data: undefined }

    const alertIds = (evidence as { alert_id: string }[]).map(e => e.alert_id)

    const { error } = await supabase
      .from('alerts')
      .update({
        status:      'resolved',
        resolved_at: new Date().toISOString(),
        updated_at:  new Date().toISOString(),
      })
      .in('id', alertIds)
      .eq('user_id', userId)
      .in('status', ['active', 'snoozed'])

    if (error) return toResultError('INTERNAL_ERROR', 'Failed to resolve alerts for fact')
    return { ok: true, data: undefined }
  },
}
