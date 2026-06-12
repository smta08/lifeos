'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/services/auth/requireUser'
import { factRepo } from '@/repositories/factRepo'
import { alertRepo } from '@/repositories/alertRepo'
import { activityRepo } from '@/repositories/activityRepo'
import { inngest } from '@/inngest/client'
import { toResultError } from '@/lib/errors'

// Recompute is a background side-effect — never let a transient Inngest outage
// (e.g. no local dev server) fail a mutation whose write already succeeded.
async function dispatchRecompute(userId: string) {
  try {
    await inngest.send({ name: 'fact/changed', data: { userId } })
  } catch {
    // Swallow: the daily cron recompute is the backstop. No content is logged.
  }
}
import {
  createFactSchema,
  updateFactSchema,
  listFactsSchema,
  type CreateFactInput,
  type ListFactsInput,
} from './schema'
import type { Fact } from '@/domain/fact'
import type { Result, PaginatedResult } from '@/lib/types'

export async function createFact(data: CreateFactInput): Promise<Result<Fact>> {
  try {
    const user = await requireUser()

    const parsed = createFactSchema.safeParse(data)
    if (!parsed.success) {
      return toResultError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input')
    }

    const result = await factRepo.createFact(user.id, parsed.data)
    if (!result.ok) return result

    await activityRepo.log({
      userId:     user.id,
      action:     'fact.created',
      entityType: 'fact',
      entityId:   result.data.id,
      metadata:   { type: result.data.type, title: result.data.title },
    })

    revalidatePath('/facts')
    revalidatePath('/dashboard')
    await dispatchRecompute(user.id)
    return result
  } catch {
    return toResultError('INTERNAL_ERROR', 'Something went wrong')
  }
}

export async function updateFact(data: { id: string } & Partial<CreateFactInput>): Promise<Result<Fact>> {
  try {
    const user = await requireUser()

    const parsed = updateFactSchema.safeParse(data)
    if (!parsed.success) {
      return toResultError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input')
    }

    const { id, ...rest } = parsed.data
    const result = await factRepo.updateFact(user.id, id, rest)
    if (!result.ok) return result

    await activityRepo.log({
      userId:     user.id,
      action:     'fact.updated',
      entityType: 'fact',
      entityId:   id,
    })

    revalidatePath('/facts')
    revalidatePath('/dashboard')
    await dispatchRecompute(user.id)
    return result
  } catch {
    return toResultError('INTERNAL_ERROR', 'Something went wrong')
  }
}

export async function archiveFact(id: string): Promise<Result<void>> {
  try {
    const user = await requireUser()

    if (!id) return toResultError('VALIDATION_ERROR', 'Fact ID is required')

    const result = await factRepo.archiveFact(user.id, id)
    if (!result.ok) return result

    // Immediately resolve alerts linked to this fact; engine will also clean up on next run.
    await alertRepo.resolveAlertsForFact(user.id, id)

    await activityRepo.log({
      userId:     user.id,
      action:     'fact.archived',
      entityType: 'fact',
      entityId:   id,
    })

    revalidatePath('/facts')
    revalidatePath('/dashboard')
    return result
  } catch {
    return toResultError('INTERNAL_ERROR', 'Something went wrong')
  }
}

export async function listFacts(filters: Partial<ListFactsInput> = {}): Promise<PaginatedResult<Fact>> {
  try {
    const user = await requireUser()

    const parsed = listFactsSchema.safeParse(filters)
    if (!parsed.success) {
      return toResultError('VALIDATION_ERROR', 'Invalid filters')
    }

    return factRepo.listFacts(user.id, parsed.data)
  } catch {
    return toResultError('INTERNAL_ERROR', 'Something went wrong')
  }
}
