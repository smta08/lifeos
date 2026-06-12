import { z } from 'zod'

export const dismissAlertSchema = z.object({
  id: z.string().uuid(),
})

export const snoozeAlertSchema = z.object({
  id:    z.string().uuid(),
  until: z.string().datetime(),
})

export const listAlertsSchema = z.object({
  status:  z.enum(['active', 'snoozed', 'resolved', 'dismissed']).array().default(['active', 'snoozed']),
  page:    z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
})

export const resolveAlertSchema = z.object({
  id: z.string().uuid(),
})

export type DismissAlertInput = z.infer<typeof dismissAlertSchema>
export type SnoozeAlertInput  = z.infer<typeof snoozeAlertSchema>
export type ListAlertsInput   = z.infer<typeof listAlertsSchema>
export type ResolveAlertInput = z.infer<typeof resolveAlertSchema>
