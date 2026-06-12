// Phase 1 alert recompute pipeline — deterministic date-math only, no AI.
// Two functions:
//   dailyRecompute   — cron 0 6 * * *, fans out one fact/changed event per user
//   recomputeAlerts  — handles fact/changed, processes a single user

import { inngest } from '../client'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeAlerts, activeDedupeKeys } from '@/features/alerts/engine'
import type { Fact, FactType, FactStatus, FactSource, Recurrence } from '@/domain/fact'

// ─── Daily fan-out ───────────────────────────────────────────────────────────

export const dailyRecompute = inngest.createFunction(
  { id: 'daily-recompute' },
  { cron: '0 6 * * *' },
  async ({ step }) => {
    const userIds = await step.run('load-user-ids', async () => {
      const supabase = createAdminClient()
      // profiles PK `id` mirrors auth.users.id — that IS the user id.
      const { data } = await supabase.from('profiles').select('id')
      return (data ?? []).map((r: { id: string }) => r.id) as string[]
    })

    if (userIds.length > 0) {
      await step.sendEvent(
        'fan-out-fact-changed',
        userIds.map((userId: string) => ({
          name: 'fact/changed' as const,
          data: { userId },
        })),
      )
    }
  },
)

// ─── Per-user recompute ───────────────────────────────────────────────────────

export const recomputeAlerts = inngest.createFunction(
  { id: 'recompute-alerts' },
  { event: 'fact/changed' },
  async ({ event, step }) => {
    const { userId } = event.data as { userId: string }

    // Step 1: load profile timezone + active facts (raw strings — step.run JSON-serializes return values).
    // Only derived data (not raw content) crosses step boundaries.
    type RawFact = {
      id: string; user_id: string; type: string; title: string; category: string | null;
      amount: string | null; currency: string | null; due_date: string | null;
      recurrence: string; status: string; source: string; connection_id: string | null;
      external_ref: string | null; metadata: Record<string, unknown>;
      created_at: string; updated_at: string;
    }

    const { timezone, rawFacts } = await step.run('load-context', async () => {
      const supabase = createAdminClient()

      const [{ data: profile }, { data: factsData }] = await Promise.all([
        supabase
          .from('profiles')
          .select('timezone')
          .eq('id', userId)
          .single(),
        supabase
          .from('facts')
          .select(
            'id, user_id, type, title, category, amount, currency, due_date, ' +
            'recurrence, status, source, connection_id, external_ref, metadata, created_at, updated_at',
          )
          .eq('user_id', userId)
          .eq('status', 'active'),
      ])

      const tz = (profile as { timezone: string } | null)?.timezone ?? 'UTC'
      return { timezone: tz, rawFacts: (factsData ?? []) as unknown as RawFact[] }
    })

    // Hydrate string dates to Date objects after step boundary.
    const facts: Fact[] = rawFacts.map((row) => ({
      id:           row.id,
      userId:       row.user_id,
      type:         row.type         as FactType,
      title:        row.title,
      category:     row.category,
      amount:       row.amount,
      currency:     row.currency,
      dueDate:      row.due_date ? new Date(row.due_date) : null,
      recurrence:   row.recurrence   as Recurrence,
      status:       row.status       as FactStatus,
      source:       row.source       as FactSource,
      metadata:     row.metadata,
      connectionId: row.connection_id,
      externalRef:  row.external_ref,
      createdAt:    new Date(row.created_at),
      updatedAt:    new Date(row.updated_at),
    }))

    // Compute specs outside a step — pure, synchronous, no I/O.
    const specs = computeAlerts(facts, timezone, new Date())
    const activeKeys = activeDedupeKeys(specs)

    // Step 2: upsert each alert spec.
    if (specs.length > 0) {
      await step.run('upsert-alerts', async () => {
        const supabase = createAdminClient()

        for (const spec of specs) {
          const { data: existing } = await supabase
            .from('alerts')
            .select('id, status')
            .eq('user_id', userId)
            .eq('dedupe_key', spec.dedupeKey)
            .maybeSingle()

          if (existing) {
            const newStatus =
              existing.status === 'resolved' || existing.status === 'dismissed'
                ? 'active'
                : existing.status
            await supabase
              .from('alerts')
              .update({
                title:            spec.title,
                urgency:          spec.urgency,
                suggested_action: spec.suggestedAction,
                status:           newStatus,
                updated_at:       new Date().toISOString(),
              })
              .eq('id', existing.id)
              .eq('user_id', userId)
          } else {
            const { data: inserted } = await supabase
              .from('alerts')
              .insert({
                user_id:          userId,
                dedupe_key:       spec.dedupeKey,
                category:         spec.category,
                urgency:          spec.urgency,
                title:            spec.title,
                suggested_action: spec.suggestedAction,
                status:           'active',
                source:           'rule_engine',
              })
              .select('id')
              .single()

            if (inserted) {
              await supabase
                .from('alert_evidence')
                .insert({ alert_id: (inserted as { id: string }).id, fact_id: spec.evidenceFactId })
            }
          }
        }
      })
    }

    // Step 3: resolve rule-engine alerts whose dedupe_key is no longer active.
    await step.run('resolve-stale', async () => {
      const supabase = createAdminClient()
      const keysArray = Array.from(activeKeys)

      if (keysArray.length === 0) {
        // No active specs — resolve all rule_engine keyed alerts for this user
        await supabase
          .from('alerts')
          .update({
            status:      'resolved',
            resolved_at: new Date().toISOString(),
            updated_at:  new Date().toISOString(),
          })
          .eq('user_id', userId)
          .in('status', ['active', 'snoozed'])
          .not('dedupe_key', 'is', null)
          .eq('source', 'rule_engine')
        return
      }

      await supabase
        .from('alerts')
        .update({
          status:      'resolved',
          resolved_at: new Date().toISOString(),
          updated_at:  new Date().toISOString(),
        })
        .eq('user_id', userId)
        .in('status', ['active', 'snoozed'])
        .not('dedupe_key', 'is', null)
        .eq('source', 'rule_engine')
        .not('dedupe_key', 'in', `(${keysArray.join(',')})`)
    })
  },
)
