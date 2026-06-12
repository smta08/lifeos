'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { requireUser } from '@/services/auth/requireUser'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { activityRepo } from '@/repositories/activityRepo'
import { toResultError } from '@/lib/errors'
import type { Result } from '@/lib/types'

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  timezone:    z.string().min(1).max(60),
})

const updateNotificationsSchema = z.object({
  notifyEmail:   z.boolean(),
  notifyCadence: z.enum(['off', 'daily', 'weekly']),
})

export async function updateProfile(rawInput: unknown): Promise<Result<void>> {
  try {
    const user   = await requireUser()
    const parsed = updateProfileSchema.safeParse(rawInput)
    if (!parsed.success) return toResultError('VALIDATION_ERROR', 'Invalid profile data')

    const supabase = await createClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: parsed.data.displayName ?? null,
        timezone:     parsed.data.timezone,
        updated_at:   new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) return toResultError('INTERNAL_ERROR', 'Failed to update profile')

    await activityRepo.log({
      userId:     user.id,
      action:     'profile.updated',
      entityType: 'profile',
      entityId:   user.id,
    })

    return { ok: true, data: undefined }
  } catch {
    return toResultError('INTERNAL_ERROR', 'Something went wrong')
  }
}

export async function updateNotifications(rawInput: unknown): Promise<Result<void>> {
  try {
    const user   = await requireUser()
    const parsed = updateNotificationsSchema.safeParse(rawInput)
    if (!parsed.success) return toResultError('VALIDATION_ERROR', 'Invalid notification settings')

    const supabase = await createClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        notify_email:   parsed.data.notifyEmail,
        notify_cadence: parsed.data.notifyCadence,
        updated_at:     new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) return toResultError('INTERNAL_ERROR', 'Failed to update notifications')
    return { ok: true, data: undefined }
  } catch {
    return toResultError('INTERNAL_ERROR', 'Something went wrong')
  }
}

export async function deleteAccount(): Promise<Result<void>> {
  try {
    const user = await requireUser()

    // Admin client required to delete auth user; this cascades all user data via ON DELETE CASCADE.
    // Acceptable service-role use: account deletion is a one-time destructive action, not a query path.
    const admin = createAdminClient()
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) return toResultError('INTERNAL_ERROR', 'Failed to delete account')

    const supabase = await createClient()
    await supabase.auth.signOut()

    redirect('/')
  } catch (err: unknown) {
    // redirect() throws internally — let it propagate
    if (err && typeof err === 'object' && 'digest' in err) throw err
    return toResultError('INTERNAL_ERROR', 'Something went wrong')
  }
}
