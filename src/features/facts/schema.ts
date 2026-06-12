import { z } from 'zod'

const FACT_TYPES = [
  'subscription', 'document', 'insurance', 'warranty', 'lease',
  'license', 'passport', 'receipt', 'bill', 'task', 'goal', 'custom',
] as const

const RECURRENCES = ['none', 'weekly', 'monthly', 'yearly'] as const

const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP', 'AUD', 'JPY', 'INR'] as const

export const createFactSchema = z.object({
  type:       z.enum(FACT_TYPES),
  title:      z.string().min(1, 'Title is required').max(200),
  category:   z.string().max(100).optional(),
  amount:     z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount (e.g. 9.99)')
    .optional(),
  currency:   z.enum(CURRENCIES).default('CAD'),
  dueDate:    z.string().datetime({ offset: true }).optional().or(z.literal('')),
  recurrence: z.enum(RECURRENCES).default('none'),
  metadata:   z.record(z.unknown()).default({}),
})

export const updateFactSchema = createFactSchema
  .partial()
  .extend({ id: z.string().uuid() })

export const listFactsSchema = z.object({
  query:    z.string().max(200).optional(),
  type:     z.enum(FACT_TYPES).optional(),
  status:   z.enum(['active', 'archived', 'resolved']).default('active'),
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type CreateFactInput = z.infer<typeof createFactSchema>
export type UpdateFactInput = z.infer<typeof updateFactSchema>
export type ListFactsInput  = z.infer<typeof listFactsSchema>
