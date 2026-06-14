# Architecture

LifeOS is an AI-assisted personal life-admin app. It surfaces what a user is forgetting
(expiries, renewals, bills, disputes) and, with explicit approval, executes follow-ups.
The product's first job is trust: it sees the user's data so the user doesn't have to hold
it in their head, and it stores as little of that data as possible.

## Stack

- **Next.js 14** (App Router, React Server Components, Server Actions)
- **TypeScript** (strict mode)
- **Tailwind CSS v3** (major version locked at setup) + **shadcn/ui** + **Framer Motion**
- **TanStack Query** for client cache, **React Hook Form + Zod** for forms and validation
- **Supabase** (Postgres, Auth, Storage) for the user data plane
- **Prisma** for migrations and service-role paths only
- **Inngest** for background jobs, **Resend** for transactional email
- **Anthropic API** for the optional AI categorization and life-scan pipeline

## Module boundaries

We organize by feature folder rather than by technical layer. Each layer has a strict
dependency direction:

- `src/domain/` — pure types and business rules. Imports no framework code. This is where
  date math, urgency scoring, and spending calculations live, so they stay unit-testable in
  isolation.
- `src/repositories/` — the **only** place the Supabase data client or Prisma is touched.
  Everything above this layer is ignorant of which client served a query.
- `src/services/` — infrastructure adapters (auth, AI, email, billing). They wrap third-party
  SDKs behind app-shaped interfaces.
- `src/features/` — UI and Server Actions for a product area. A feature may import from
  `domain`, `repositories`, and `services`. Nothing in `domain` imports app-specific code.

## Data access model

Supabase Row Level Security (RLS) is our hard tenancy boundary. Two facts drive the design:

1. Prisma's default connection bypasses RLS because it connects as a privileged role.
2. The Supabase client, used under a user's JWT, enforces RLS by construction.

Therefore **all user-path reads and writes go through the Supabase client under the user's
JWT**, and Prisma is reserved for migrations and webhook/service-role work. The repository
layer hides this split; no feature or service constructs a database client directly.

The `activity_log` table is append-only by design. Integrity comes from the *absence* of
update and delete RLS policies, not from routing writes through a privileged role. Activity
rows are written under the user JWT in the same logical operation as the mutation they
describe. Service-role activity writes exist only for system events such as webhooks and cron.

## API surface

- **Mutations are Server Actions.** They are colocated with the feature that owns them.
- **External callers** (Stripe, Inngest, OAuth callbacks) hit **Route Handlers** under
  `src/app/api/`.
- Every action and handler returns a discriminated result:
  `{ ok: true, data } | { ok: false, error: { code, message } }`.
- Error messages returned to the client are user-safe strings. Full error detail is logged
  server-side; we never echo a database error or stack trace to the browser.
- AI-triggering actions are rate limited per user per day.

## The AI pipeline

The Phase 1 alert engine is fully **deterministic** — it is date math over the user's facts,
with an optional cached categorization step. The Phase 2 life scan is a staged pipeline:

```
SQL date pre-pass → model pre-filter → cross-reference model → Zod parse → code validators → upsert
```

Two properties make this safe to run over attacker-influenceable input (scanned email):

- **Inngest memoizes step outputs.** No step ever returns raw email or document content;
  fetch, extract, and discard happen inside a single step, and only derived facts and opaque
  ids cross a step boundary.
- **The phishing validator runs in code, after Zod, not in the prompt.** We reject any alert
  whose title or suggested action contains a URL, phone number, or email address that does
  not appear verbatim in a cited fact. Prompt rules are not a security control; validators are.

Evidence ids that the requesting user does not own cause the entire batch to be rejected.
See [SECURITY.md](./SECURITY.md) for the full set of guards.

## Reference

- Full technical requirements: [TRD.md](./TRD.md)
- Architecture review and adopted overrides: [TRD-review.md](./TRD-review.md)
