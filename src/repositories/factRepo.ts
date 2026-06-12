// All reads/writes use the Supabase client under the user's JWT so RLS is enforced by construction.
// Sensitive field (document/account/policy numbers): encrypt on write, decrypt on read — never in metadata.

import { createClient } from '@/lib/supabase/server'
import { toResultError } from '@/lib/errors'
import type { Fact, FactType, FactStatus, FactSource, Recurrence } from '@/domain/fact'
import type { Result, PaginatedResult } from '@/lib/types'
import type { CreateFactInput, UpdateFactInput, ListFactsInput } from '@/features/facts/schema'

// ─── Row → Domain mapper ─────────────────────────────────────────────────────

interface FactRow {
  id: string
  user_id: string
  type: string
  title: string
  category: string | null
  amount: string | null
  currency: string | null
  due_date: string | null
  recurrence: string
  status: string
  source: string
  connection_id: string | null
  external_ref: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

function rowToFact(row: FactRow): Fact {
  return {
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
  }
}

// ─── Repository ───────────────────────────────────────────────────────────────

export const factRepo = {
  async createFact(userId: string, input: CreateFactInput): Promise<Result<Fact>> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('facts')
      .insert({
        user_id:    userId,
        type:       input.type,
        title:      input.title,
        category:   input.category   ?? null,
        amount:     input.amount     ?? null,
        currency:   input.currency   ?? 'CAD',
        due_date:   input.dueDate    || null,
        recurrence: input.recurrence ?? 'none',
        metadata:   input.metadata   ?? {},
        source:     'manual',
      })
      .select()
      .single()

    if (error) return toResultError('INTERNAL_ERROR', 'Failed to save fact')
    return { ok: true, data: rowToFact(data as FactRow) }
  },

  async updateFact(userId: string, id: string, input: Omit<UpdateFactInput, 'id'>): Promise<Result<Fact>> {
    const supabase = await createClient()
    const patch: Record<string, unknown> = {}
    if (input.title      !== undefined) patch.title      = input.title
    if (input.category   !== undefined) patch.category   = input.category ?? null
    if (input.amount     !== undefined) patch.amount     = input.amount ?? null
    if (input.currency   !== undefined) patch.currency   = input.currency
    if (input.dueDate    !== undefined) patch.due_date   = input.dueDate || null
    if (input.recurrence !== undefined) patch.recurrence = input.recurrence
    if (input.metadata   !== undefined) patch.metadata   = input.metadata

    const { data, error } = await supabase
      .from('facts')
      .update(patch)
      .eq('id', id)
      .eq('user_id', userId)   // defence-in-depth; RLS also enforces this
      .select()
      .single()

    if (error) return toResultError('INTERNAL_ERROR', 'Failed to update fact')
    if (!data)  return toResultError('NOT_FOUND', 'Fact not found')
    return { ok: true, data: rowToFact(data as FactRow) }
  },

  async archiveFact(userId: string, id: string): Promise<Result<void>> {
    const supabase = await createClient()
    const { error } = await supabase
      .from('facts')
      .update({ status: 'archived' })
      .eq('id', id)
      .eq('user_id', userId)

    if (error) return toResultError('INTERNAL_ERROR', 'Failed to archive fact')
    return { ok: true, data: undefined }
  },

  async getFactById(userId: string, id: string): Promise<Result<Fact>> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('facts')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error || !data) return toResultError('NOT_FOUND', 'Fact not found')
    return { ok: true, data: rowToFact(data as FactRow) }
  },

  async listFacts(userId: string, filters: ListFactsInput): Promise<PaginatedResult<Fact>> {
    const supabase = await createClient()
    const { page, pageSize, type, status, query } = filters

    let q = supabase
      .from('facts')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1)

    if (type)  q = q.eq('type', type)
    if (query) q = q.ilike('title', `%${query}%`)

    const { data, error, count } = await q

    if (error) return toResultError('INTERNAL_ERROR', 'Failed to load facts')

    const items = (data as FactRow[] ?? []).map(rowToFact)
    const hasMore = page * pageSize < (count ?? 0)
    return { ok: true, data: { items, nextCursor: hasMore ? String(page + 1) : null } }
  },
}
