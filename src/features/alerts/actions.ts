'use server'
// Pattern: requireUser() → Zod validate → repository → activity log → typed result

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/services/auth/requireUser'
import { toResultError } from '@/lib/errors'
import { alertRepo } from '@/repositories/alertRepo'
import { activityRepo } from '@/repositories/activityRepo'
import {
  dismissAlertSchema,
  snoozeAlertSchema,
  listAlertsSchema,
  resolveAlertSchema,
} from './schema'
import type { Result, PaginatedResult } from '@/lib/types'
import type { Alert } from '@/domain/alert'

export async function listAlerts(rawInput: unknown): Promise<PaginatedResult<Alert>> {
  try {
    const user = await requireUser()
    const parsed = listAlertsSchema.safeParse(rawInput ?? {})
    if (!parsed.success) return toResultError('VALIDATION_ERROR', 'Invalid filters')
    return alertRepo.listAlerts(user.id, parsed.data)
  } catch {
    return toResultError('INTERNAL_ERROR', 'Something went wrong')
  }
}

export async function dismissAlert(rawInput: unknown): Promise<Result<void>> {
  try {
    const user = await requireUser()
    const parsed = dismissAlertSchema.safeParse(rawInput)
    if (!parsed.success) return toResultError('VALIDATION_ERROR', 'Invalid input')

    const result = await alertRepo.updateAlertStatus(user.id, parsed.data.id, 'dismissed')
    if (!result.ok) return result

    await activityRepo.log({
      userId:     user.id,
      action:     'alert.dismissed',
      entityType: 'alert',
      entityId:   parsed.data.id,
    })

    revalidatePath('/dashboard')
    return { ok: true, data: undefined }
  } catch {
    return toResultError('INTERNAL_ERROR', 'Something went wrong')
  }
}

export async function snoozeAlert(rawInput: unknown): Promise<Result<void>> {
  try {
    const user = await requireUser()
    const parsed = snoozeAlertSchema.safeParse(rawInput)
    if (!parsed.success) return toResultError('VALIDATION_ERROR', 'Invalid input')

    const snoozedUntil = new Date(parsed.data.until)

    const result = await alertRepo.updateAlertStatus(
      user.id,
      parsed.data.id,
      'snoozed',
      { snoozedUntil },
    )
    if (!result.ok) return result

    await activityRepo.log({
      userId:     user.id,
      action:     'alert.snoozed',
      entityType: 'alert',
      entityId:   parsed.data.id,
      metadata:   { until: parsed.data.until },
    })

    revalidatePath('/dashboard')
    return { ok: true, data: undefined }
  } catch {
    return toResultError('INTERNAL_ERROR', 'Something went wrong')
  }
}

export async function resolveAlert(rawInput: unknown): Promise<Result<void>> {
  try {
    const user = await requireUser()
    const parsed = resolveAlertSchema.safeParse(rawInput)
    if (!parsed.success) return toResultError('VALIDATION_ERROR', 'Invalid input')

    const result = await alertRepo.updateAlertStatus(
      user.id,
      parsed.data.id,
      'resolved',
      { resolvedAt: new Date() },
    )
    if (!result.ok) return result

    await activityRepo.log({
      userId:     user.id,
      action:     'alert.resolved',
      entityType: 'alert',
      entityId:   parsed.data.id,
    })

    revalidatePath('/dashboard')
    return { ok: true, data: undefined }
  } catch {
    return toResultError('INTERNAL_ERROR', 'Something went wrong')
  }
}
