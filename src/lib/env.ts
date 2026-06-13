import { z } from 'zod'
import { normalizeSupabaseUrl } from '@/lib/supabase/config'

// Treat an empty-string env var the same as unset. Without this, a key present
// but blank in .env (e.g. INNGEST_SIGNING_KEY=) fails .min(1) and throws at
// module load, taking down any route that imports env.
const optionalSecret = () =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().min(1).optional(),
  )

const envSchema = z.object({
  // Supabase — required at runtime
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url()
    .transform(normalizeSupabaseUrl),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  // Service-role key: webhook handlers and migrations ONLY — never in user query paths
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Prisma — pooler URL for runtime, direct URL for migrations
  DATABASE_URL: z.string().min(1),
  DIRECT_URL:   z.string().min(1),

  // AI — optional until Phase 2 AI pipeline is wired up
  ANTHROPIC_API_KEY: optionalSecret(),

  // Inngest — optional until background jobs are registered
  INNGEST_SIGNING_KEY: optionalSecret(),
})

export type Env = z.infer<typeof envSchema>

// Throws at server startup if any required var is missing or malformed.
// Import `env` instead of reading process.env directly anywhere else.
export const env = envSchema.parse(process.env)
