# Database

Postgres on Supabase is the system of record. Prisma owns the schema and migrations; the
Supabase client owns user-path queries so RLS stays in force. See [SECURITY.md](./SECURITY.md)
for the tenancy rules that the schema exists to support.

## Access rules

- Prisma is imported only inside `src/repositories/`. No feature or service imports
  `PrismaClient` directly.
- Every user-path query runs under the user JWT through the Supabase client, so RLS applies.
  We never reach for the service role to "make a query work."
- There is no raw SQL in services or features.

## Conventions

- Every user-owned table carries a `user_id` column and an RLS policy of `user_id = auth.uid()`.
- We make additive schema changes. We never destructively `ALTER` a populated column.
- Alerts upsert on `dedupe_key`, so re-running the engine never inserts a duplicate alert.

## Indexes

We maintain these composite indexes for the hot read paths:

- `facts (user_id, due_date)`
- `facts (user_id, type)`
- `alerts (user_id, status, urgency)`

## Schema notes

- **`facts`** carries provenance: `connection_id` (FK to `oauth_connections`) plus an
  `external_ref`, with `unique (user_id, external_ref)`. The scanner upserts on it, and a
  disconnect-purge deletes by it. `recurrence` is one of `none | weekly | monthly | yearly`,
  and `due_date` is the *next* occurrence — the engine advances it when it passes on a
  recurring fact. The engine scans only `status = 'active'` facts, and archiving a fact
  resolves its alerts.
- **`alerts`** dedupe keys are computed server-side. Rule-engine keys exclude the window
  (`expiry:{fact.id}`, not `expiry:{fact.id}:30`). AI alert keys are
  `ai:` + `sha256(sorted(evidence_fact_ids) + ':' + normalized(category))`.
- **`alert_evidence`** is a join table with FKs and cascade deletes. It is the storage form
  for evidence; `evidence_fact_ids` exists only as a model-output shape, never as a column.
- **`webhook_events (id pk, source, received_at)`** backs webhook idempotency via
  `INSERT … ON CONFLICT DO NOTHING`.
- **`subscriptions`** is the single source of truth for a user's tier and is written by the
  Stripe webhook. We never gate entitlements on `profiles`. It has a unique index on
  `stripe_customer_id`.
- **`oauth_connections`** includes `provider_account_id`, `refresh_ref`, `status`, and
  `sync_cursor`, with `unique (user_id, provider, provider_account_id)`.
- **`facts.sensitive`** is envelope-encrypted `bytea`. Encryption and decryption happen only
  inside `factRepo`. Sensitive values never go in indexed `metadata` jsonb.
- All engine date math runs in `profiles.timezone`.

## Testing

The RLS isolation test runs before every deploy: user A must never read user B's rows,
exercised through the repository layer rather than a raw client.
