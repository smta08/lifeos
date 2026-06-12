import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { recomputeAlerts, dailyRecompute } from '@/inngest/functions/recompute'
import { sendDigest } from '@/inngest/functions/digest'
import { categorizeFact } from '@/inngest/functions/categorize'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [recomputeAlerts, dailyRecompute, sendDigest, categorizeFact],
})
