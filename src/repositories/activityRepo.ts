// Append-only via user JWT. No UPDATE/DELETE RLS policies exist by design.
// System events (webhooks, cron) use service-role writes only.

import { createClient } from '@/lib/supabase/server'
import { toResultError } from '@/lib/errors'
import type { Result, PaginatedResult } from '@/lib/types'

export interface ActivityLogInput {
  userId: string
  action: string
  entityType: string
  entityId: string
  metadata?: Record<string, unknown>
}

export interface ActivityEntry extends ActivityLogInput {
  id: string
  createdAt: string
}

interface ActivityRow {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  metadata: Record<string, unknown>
  created_at: string
}

function rowToEntry(row: ActivityRow): ActivityEntry {
  return {
    id:         row.id,
    userId:     row.user_id,
    action:     row.action,
    entityType: row.entity_type,
    entityId:   row.entity_id,
    metadata:   row.metadata,
    createdAt:  row.created_at,
  }
}

export const activityRepo = {
  async log(entry: ActivityLogInput): Promise<Result<void>> {
    const supabase = await createClient()
    const { error } = await supabase.from('activity_logs').insert({
      user_id:     entry.userId,
      action:      entry.action,
      entity_type: entry.entityType,
      entity_id:   entry.entityId,
      metadata:    entry.metadata ?? {},
    })
    if (error) return toResultError('INTERNAL_ERROR', 'Failed to write activity log')
    return { ok: true, data: undefined }
  },

  async list(userId: string, cursor?: string): Promise<PaginatedResult<ActivityEntry>> {
    const supabase = await createClient()
    const page = cursor ? parseInt(cursor, 10) : 1
    const pageSize = 30

    const { data, error, count } = await supabase
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1)

    if (error) return toResultError('INTERNAL_ERROR', 'Failed to load activity')

    const items = (data as ActivityRow[] ?? []).map(rowToEntry)
    const hasMore = page * pageSize < (count ?? 0)
    return { ok: true, data: { items, nextCursor: hasMore ? String(page + 1) : null } }
  },
}
