# LifeOS — Technical Requirements Document (TRD)

**Version:** 1.0 **Status:** Implementation-ready **Audience:** An intermediate developer comfortable with React/Next.js basics. **Scope:** Phases 1–3, with Phase 1 specified to full implementation depth.

> This document is opinionated by design. Where options exist, one is chosen and the reasoning is given inline. Security notes, testing tips, and debugging tips are embedded in the relevant sections rather than collected at the end.

---

## Table of Contents

1. [Project Vision & Philosophy](#1-project-vision--philosophy)
2. [Phase Overview & Migration Path](#2-phase-overview--migration-path)
3. [Full Feature List (tagged P1/P2/P3)](#3-full-feature-list)
4. [Every Page & Screen](#4-every-page--screen)
5. [Database Schema](#5-database-schema)
6. [API Design](#6-api-design)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Privacy & Security Architecture](#8-privacy--security-architecture)
9. [AI Integration Specs](#9-ai-integration-specs)
10. [Background Jobs (Inngest)](#10-background-jobs-inngest)
11. [Stripe Integration](#11-stripe-integration)
12. [Service Setup](#12-service-setup)
13. [Full Project Folder Structure](#13-full-project-folder-structure)
14. [Implementation Order](#14-implementation-order)
15. [Testing Strategy](#15-testing-strategy)
16. [Debugging Guide](#16-debugging-guide)
17. [Security Checklist](#17-security-checklist)
18. [Performance Considerations](#18-performance-considerations)
19. [Cost Management](#19-cost-management)
20. [Future Expansion Roadmap](#20-future-expansion-roadmap)

---

## 1. Project Vision & Philosophy

### 1.1 What LifeOS is

LifeOS is an AI operating system for personal life administration. It is not a chatbot and not a task manager. It is an **executor**: it notices the life-admin work a person keeps postponing, surfaces it at the right moment, and — with explicit approval — gets it done.

The work it targets shares three traits: too important to ignore, too tedious to do immediately, and persistently occupying mental background. Examples: bill disputes, subscription cancellations, document/passport/license expiries, insurance renewals, lease-clause deadlines, warranty tracking, tax reminders, appointment booking, government form filling, complaint letters.

The core loop is always: **AI notices → surfaces → user approves → AI executes.** Nothing executes without a human's explicit confirmation (with an opt-in autonomy mode reserved for Phase 3).

### 1.2 Why it exists

Every adult runs a background process that tracks dozens of small obligations. That process leaks — deadlines are missed, money is wasted on forgotten subscriptions, renewals lapse. LifeOS offloads that process to software that does not forget and is not anxious about it.

### 1.3 The trust problem (the central constraint)

Nobody hands a startup their emails, bank data, and private documents on a promise. Therefore the product's first job is to earn that trust structurally, not rhetorically.

**Privacy is not a feature. Privacy IS the product.** Tagline: *"LifeOS sees everything. We see nothing."*

This is backed by architecture, not slogans:

- Never store raw emails, documents, or credentials.
- OAuth only; no passwords; read-only scopes.
- Extract minimal **derived facts** (dates, amounts, categories, deadlines), then delete the raw content.
- Encrypt facts at rest; isolate per user with row-level security.
- Human approval before execution.

> **Honest caveat surfaced up front (see §8.4):** "We see nothing" is precisely true for *raw content* (we never persist it) and for *staff access* (none). It is **not** literally true that the server never processes plaintext facts — server-side AI reasoning requires plaintext derived facts in memory at scan time. The TRD treats this tension explicitly rather than pretending it away, and offers a strict local-processing mode for users who want true zero-knowledge.

### 1.4 Product philosophy

Apple-level calm. Minimal, premium, invisible. The product should *reduce* notification load, not add to it — surfacing fewer, better items. Design references: Apple, Linear, Raycast, Notion, Arc. Visual language: rounded cards, soft shadows, generous whitespace, dark + light mode, subtle motion.

---

## 2. Phase Overview & Migration Path

### 2.1 Phase 1 — Free MVP (~$0/month to operate)

**Goal:** validate demand and retention at zero variable cost.

- Manual input only. The user types their own facts.
- Alert engine is **deterministic** (date math + rules). No per-user AI cost.
- A small categorization model is used sparingly: optional fact categorization on input and an optional low-frequency insight summary. Both are rate-limited and cache-backed so Phase 1 stays effectively free.
- No email scanning, no OCR, no browser automation, no voice.

**Operating cost:** Vercel free tier + Supabase free tier + domain ≈ $1–5/month total.

### 2.2 Phase 2 — Pro ($9–12/month; launch after ~50 active free users)

- Gmail/Outlook OAuth scanning, **weekly cadence** to control cost.
- Document photo + OCR via a multimodal model.
- Browser automation for form filling (Browserbase + Stagehand).
- A **runtime reasoning model** powers the life scan.
- Target cost/user ≈ $3–5/month.

### 2.3 Phase 3 — Full AI Executive ($19–25/month)

- Daily AI life scan over full context.
- Voice agent calls (Retell AI).
- Autonomous form submission and appointment booking (opt-in).
- Bill negotiation; continuous background reasoning.
- Per-action **credit** billing for expensive operations (phone calls, negotiations).
- Target cost/user ≈ $8–12/month.

### 2.4 Migration path — schema decisions that matter now

These Phase-1 decisions are made specifically to avoid painful Phase-2 migrations:


| Decision made in P1                                                             | Why it prevents a P2 migration                                             |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `facts.source` enum includes `manual`, `email`, `ocr`, `api` from day one       | Email/OCR facts slot into the same table; no new entity, no backfill.      |
| `facts.metadata` is `jsonb`                                                     | New fact attributes from scanning need no schema change.                   |
| `alerts.source` enum includes `rule_engine` and `ai_scan` from day one          | AI-generated alerts coexist with rule alerts; the UI already handles both. |
| `alerts.evidence_fact_ids` (`jsonb` array) exists in P1 (rules populate one id) | The reasoning model's multi-fact evidence fits the same column.            |
| `ai_runs` token-logging table created (empty in P1)                             | Cost monitoring is wired before the first expensive call, not after.       |
| Every table carries `user_id` + RLS from day one                                | Adding scanning never requires re-architecting tenancy.                    |
| `oauth_connections` table designed (unused in P1)                               | Phase 2 adds rows, not tables.                                             |


> **Migration rule:** never let a Phase-1 shortcut force a destructive Phase-2 ALTER. Additive columns and pre-planned enums are cheap; renaming a populated table is not.

---

## 3. Full Feature List

Tags: **P1** = Free MVP, **P2** = Pro, **P3** = Executive.

### 3.1 Facts (the core entity)

- Add a fact of any type: subscription, document, insurance, warranty, lease, license, passport, receipt, bill, task, goal, custom. **(P1)**
- Edit / delete a fact. **(P1)**
- Each fact stores a title, category, optional amount + currency, optional due/expiry date, status, and free-form `metadata`. **(P1)**
- Auto-categorize a fact on creation (optional, cached). **(P1)**
- Facts extracted from scanned email. **(P2)**
- Facts extracted from a document photo (OCR). **(P2)**

### 3.2 Alerts

- Deterministic alert engine: expiries within window, overdue tasks, renewal dates, financial-waste flags (unused/duplicate subscriptions). **(P1)**
- Alert urgency scoring (low / medium / high / critical). **(P1)**
- Dismiss / snooze / resolve an alert. **(P1)**
- Alert evidence: each alert links to the fact(s) that triggered it. **(P1)**
- AI-generated cross-referenced alerts from the daily/weekly life scan. **(P2)**
- "Why am I seeing this?" — show evidence facts behind each AI alert. **(P2)**

### 3.3 Dashboard & views

- Alert dashboard (cards, urgency-sorted). **(P1)**
- Memory view — browse/search/edit all stored facts. **(P1)**
- Activity log — append-only history of changes and actions. **(P1)**
- Settings — profile, notification preferences, data export, account deletion. **(P1)**
- Empty / loading / error states for every view. **(P1)**

### 3.4 Notifications

- In-app alert surfacing. **(P1)**
- Transactional email digests via Resend (opt-in cadence). **(P1)**

### 3.5 Integrations & execution

- Gmail/Outlook OAuth connect (read-only). **(P2)**
- Weekly email scan job. **(P2)**
- Browser automation: draft + (with approval) submit forms. **(P2)**
- Voice agent phone calls. **(P3)**
- Appointment booking. **(P3)**
- Bill negotiation workflow. **(P3)**
- Opt-in autonomy: pre-approve a category so AI executes without per-action confirmation. **(P3)**

### 3.6 Billing

- Stripe subscription (Free / Pro / Executive). **(P2)**
- Credit balance + per-action billing for expensive ops. **(P3)**

### 3.7 Privacy controls

- Data export (all derived facts as JSON). **(P1)**
- Hard account deletion (cascade). **(P1)**
- Per-integration disconnect + purge. **(P2)**
- Strict local-processing mode (on-device reasoning, nothing sent to server). **(P3, opt-in)**

---

## 4. Every Page & Screen

Routes use the Next.js App Router. Authenticated routes live under a `(app)` route group; public/marketing under `(marketing)`; auth under `(auth)`.

### 4.1 `/` — Marketing landing **(public)**

- **Purpose:** explain the product, lead with the privacy promise, drive sign-up.
- **Components:** hero (tagline "LifeOS sees everything. We see nothing."), how-it-works, privacy-architecture explainer, pricing, CTA.
- **States:** static; no data.
- **Test:** renders without a session; CTA routes to `/signup`.

### 4.2 `/login` and `/signup` **(auth)**

- **Purpose:** Supabase Auth — Google OAuth + email magic link.
- **Components:** auth card, Google button, email input, error banner.
- **Flow:** success → redirect to `/dashboard`; existing session → redirect away from auth pages (middleware).
- **States:** idle, submitting (button spinner), error (invalid email / OAuth denied).
- **Security note:** never render auth error details that leak whether an email exists; use a generic "check your email" message for magic links.
- **Test:** unauthenticated user reaching `/dashboard` is redirected to `/login`; authenticated user reaching `/login` is redirected to `/dashboard`.

### 4.3 `/dashboard` — Alert dashboard **(app, default landing)**

- **Purpose:** the calm home screen — surfaces only what needs attention.
- **Components:** greeting header, urgency-grouped `AlertCard` list, quick-add FAB, empty state.
- **AlertCard:** title, category pill, urgency dot, due date, evidence chip ("from: Netflix subscription"), actions (Action / Snooze / Dismiss).
- **States:**
  - *Empty:* "Nothing needs you right now." (this is a feature — calm by default).
  - *Loading:* skeleton cards.
  - *Error:* inline retry, never a blank screen.
- **Data:** `listAlerts({ status: 'active' })`, urgency-sorted.
- **Test:** with 0 active alerts → empty state; with mixed urgencies → critical sorts first.

### 4.4 `/facts` — Memory view **(app)**

- **Purpose:** browse, search, edit, delete every stored fact.
- **Components:** search/filter bar (by type, category, date), `FactRow` list or grid, `FactSheet` (slide-over editor), delete confirm dialog.
- **States:** empty ("Add your first fact"), loading skeleton, error retry.
- **Data:** `listFacts({ query, type, page })` — paginated.
- **Test:** create → appears in list; edit → persists; delete → confirm dialog → removed.

### 4.5 `/facts/new` (or modal) — Add fact **(app)**

- **Purpose:** structured fact entry.
- **Components:** type selector → dynamic form (React Hook Form + Zod), date picker, amount + currency, free metadata.
- **Flow:** submit → `createFact` server action → optimistic insert via TanStack Query → optional categorization runs async.
- **Security note:** validate server-side with the same Zod schema; never trust the client form.
- **Test:** invalid input (past expiry on a future-only type, negative amount) → field errors; valid → row appears.

### 4.6 `/activity` — Activity log **(app)**

- **Purpose:** transparent history — what changed, what the AI did, what you approved.
- **Components:** reverse-chronological timeline, entity link, action label.
- **Data:** `listActivity({ page })`.
- **Test:** every create/update/delete/alert-action writes exactly one activity row.

### 4.7 `/settings` — Settings **(app)**

- **Purpose:** profile, notification cadence, data export, integrations (P2), billing (P2), delete account.
- **Components:** tabbed sections (Profile / Notifications / Privacy / Integrations / Billing).
- **Privacy tab:** "Export my data" (JSON download) and "Delete my account" (typed confirmation).
- **Security note:** account deletion must cascade (see §5) and revoke all sessions; export must include only the requesting user's rows (enforced by RLS).
- **Test:** export returns only the caller's facts; delete removes all rows and the auth user.

### 4.8 `/onboarding` — First-run **(app, one-time)**

- **Purpose:** seed 3–5 facts fast so the dashboard isn't empty on day one.
- **Components:** guided "add a subscription / a document expiry / a bill" mini-flow.
- **Test:** completing onboarding lands on a non-empty dashboard.

### 4.9 Phase 2/3 screens (specified, built later)

- `/settings/integrations` — connect Gmail/Outlook (read-only OAuth), show last scan time, disconnect+purge. **(P2)**
- `/alerts/[id]` — alert detail with evidence facts and suggested action draft. **(P2)**
- `/billing` — Stripe portal entry, plan, credit balance. **(P2/P3)**
- Execution review modal — preview the AI's drafted form/letter/call script before approving. **(P2/P3)**

> **UX rule across all screens:** every list has an explicit empty state, every async action has a loading state, and no error ever produces a blank screen.

---

## 5. Database Schema

**Engine:** Supabase Postgres. **Access:** Prisma for app queries; Supabase RLS as the hard tenancy boundary. **Identity:** Supabase `auth.users` owns authentication; a `profiles` table holds app-level user data keyed by the same UUID.

> **Tenancy rule:** every user-owned table has a `user_id uuid` column and an RLS policy `user_id = auth.uid()`. Prisma uses the service role for migrations only; all runtime queries run under the user's JWT so RLS is always in force. Never disable RLS to "make a query work" — fix the query.

### 5.1 Enums

```sql
create type fact_type as enum
  ('subscription','document','insurance','warranty','lease',
   'license','passport','receipt','bill','task','goal','custom');

create type fact_status as enum ('active','archived','resolved');

create type fact_source as enum ('manual','email','ocr','api');

create type alert_urgency as enum ('low','medium','high','critical');

create type alert_status as enum ('active','snoozed','dismissed','resolved');

create type alert_source as enum ('rule_engine','ai_scan');

create type subscription_tier as enum ('free','pro','executive');

```

### 5.2 `profiles`

```sql
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  display_name    text,
  timezone        text not null default 'UTC',
  notify_email    boolean not null default true,
  notify_cadence  text not null default 'weekly',  -- 'off' | 'daily' | 'weekly'
  tier            subscription_tier not null default 'free',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table profiles enable row level security;
create policy "own profile" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

```

### 5.3 `facts` (core)

```sql
create table facts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  type          fact_type not null,
  title         text not null,
  category      text,                         -- free text or AI-assigned
  amount        numeric(12,2),                -- nullable
  currency      char(3) default 'CAD',
  due_date      date,                         -- expiry / renewal / due
  status        fact_status not null default 'active',
  source        fact_source not null default 'manual',
  metadata      jsonb not null default '{}',  -- extensible; no schema change needed
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table facts enable row level security;
create policy "own facts" on facts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Indexes (see §18 for rationale)
create index facts_user_due_idx    on facts (user_id, due_date);
create index facts_user_type_idx   on facts (user_id, type);
create index facts_user_status_idx on facts (user_id, status);
create index facts_metadata_gin    on facts using gin (metadata);

```

### 5.4 `alerts`

```sql
create table alerts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  title             text not null,
  category          text,
  urgency           alert_urgency not null default 'medium',
  suggested_action  text,
  status            alert_status not null default 'active',
  source            alert_source not null default 'rule_engine',
  evidence_fact_ids jsonb not null default '[]',  -- array of fact UUIDs
  snooze_until      timestamptz,
  dedupe_key        text,                         -- prevents duplicate alerts per cycle
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table alerts enable row level security;
create policy "own alerts" on alerts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index alerts_user_status_idx on alerts (user_id, status, urgency);
create unique index alerts_user_dedupe_idx
  on alerts (user_id, dedupe_key) where dedupe_key is not null;

```

> **Why** `dedupe_key`**:** the daily/weekly engine re-runs and would otherwise recreate the same "passport expires in 30 days" alert. The engine computes a stable key (e.g. `expiry:{fact_id}:{window}`) and upserts on it. This is essential before AI scanning, which is non-deterministic and prone to near-duplicates.

### 5.5 `activity_log` (append-only audit)

```sql
create table activity_log (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  entity_type  text not null,        -- 'fact' | 'alert' | 'integration' | 'billing'
  entity_id    uuid,
  action       text not null,        -- 'created' | 'updated' | 'dismissed' | ...
  metadata     jsonb not null default '{}',
  created_at   timestamptz not null default now()
);
alter table activity_log enable row level security;
create policy "own activity read" on activity_log
  for select using (user_id = auth.uid());
-- Inserts happen server-side (service role) inside transactions; no client insert policy.
create index activity_user_time_idx on activity_log (user_id, created_at desc);

```

> **Security note:** the log is read-only to clients and never updatable/deletable — integrity of the audit trail is part of the trust story.

### 5.6 `ai_runs` (token + cost logging — created in P1, populated from P1's first model call)

```sql
create table ai_runs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete set null,
  job            text not null,        -- 'categorize' | 'lifescan_prefilter' | 'lifescan_reason'
  model          text not null,        -- provider model id
  input_tokens   integer,
  output_tokens  integer,
  cost_usd       numeric(10,5),
  status         text not null,        -- 'success' | 'error' | 'rejected'
  created_at     timestamptz not null default now()
);
alter table ai_runs enable row level security;
create policy "own ai_runs read" on ai_runs for select using (user_id = auth.uid());
create index ai_runs_job_time_idx on ai_runs (job, created_at desc);

```

### 5.7 `oauth_connections` (designed in P1, used in P2)

```sql
create table oauth_connections (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  provider        text not null,             -- 'gmail' | 'outlook'
  scopes          text[] not null,           -- read-only scopes only
  -- tokens are NEVER stored raw; see §8.3 (envelope-encrypted, or delegated to a vault)
  access_ref      text,                      -- reference/ciphertext handle, not the token
  last_scan_at    timestamptz,
  created_at      timestamptz not null default now()
);
alter table oauth_connections enable row level security;
create policy "own connections" on oauth_connections
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

```

### 5.8 `subscriptions` and credits (P2/P3)

```sql
create table subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id      text,
  stripe_subscription_id  text,
  tier                    subscription_tier not null default 'free',
  status                  text not null default 'inactive',
  current_period_end      timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
alter table subscriptions enable row level security;
create policy "own subscription read" on subscriptions for select using (user_id = auth.uid());
-- writes are server-side only (Stripe webhook → service role).

create table credit_transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  delta        integer not null,           -- + grant, - spend
  reason       text not null,              -- 'phone_call' | 'negotiation' | 'grant'
  balance_after integer not null,
  created_at   timestamptz not null default now()
);
alter table credit_transactions enable row level security;
create policy "own credits read" on credit_transactions for select using (user_id = auth.uid());

```

> **Balance rule:** never store a mutable `balance` column that can drift. Balance is the running `balance_after` of the latest ledger row, written inside the same transaction as the spend. The ledger is the source of truth.

> **Testing tip (schema):** write a migration test that creates a user, inserts facts as that user, then attempts to read them as a *different* user via RLS — it must return zero rows. If it returns rows, RLS is broken and nothing else matters.

---

## 6. API Design

**Decision:** mutations are **Server Actions** (co-located, type-safe, no hand-written fetch layer); reads inside RSC use the repository directly; the client uses TanStack Query wrappers around thin Route Handlers only where it needs caching/optimism. External callers (Stripe, Inngest) use **Route Handlers** under `/api`.

Every action/handler: (1) authenticates, (2) validates input with Zod, (3) calls a repository method, (4) writes an `activity_log` row in the same transaction where relevant, (5) returns a typed result.

### 6.1 Standard result shape

```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string } };

type ErrorCode =
  | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'VALIDATION' | 'NOT_FOUND'
  | 'RATE_LIMITED' | 'CONFLICT' | 'INTERNAL';

```

> **Security note:** error messages are user-safe strings; never echo raw DB errors or stack traces to the client. Log the detail server-side, return a generic message.

### 6.2 Facts (Server Actions)


| Action       | Input (Zod)                                                           | Returns                    | Notes                                                            |
| ------------ | --------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------- |
| `createFact` | `{ type, title, category?, amount?, currency?, dueDate?, metadata? }` | `Fact`                     | optimistic on client; triggers async `categorize` (P1, optional) |
| `updateFact` | `{ id, ...partial }`                                                  | `Fact`                     | ownership enforced by RLS + explicit check                       |
| `deleteFact` | `{ id }`                                                              | `{ id }`                   | soft-archive option via `status='archived'`                      |
| `listFacts`  | `{ query?, type?, status?, page?, pageSize? }`                        | `{ items: Fact[]; total }` | server-side filtered                                             |


### 6.3 Alerts (Server Actions)


| Action         | Input                   | Returns   | Notes                                     |
| -------------- | ----------------------- | --------- | ----------------------------------------- |
| `listAlerts`   | `{ status?; urgency? }` | `Alert[]` | default `status='active'`, urgency-sorted |
| `dismissAlert` | `{ id }`                | `Alert`   | writes activity row                       |
| `snoozeAlert`  | `{ id, until }`         | `Alert`   | sets `snooze_until`, status `snoozed`     |
| `resolveAlert` | `{ id }`                | `Alert`   | status `resolved`                         |


### 6.4 Account (Server Actions)


| Action            | Input                                                       | Returns                    | Notes                            |
| ----------------- | ----------------------------------------------------------- | -------------------------- | -------------------------------- |
| `exportMyData`    | `{}`                                                        | `{ url }` or streamed JSON | only caller's rows (RLS)         |
| `deleteMyAccount` | `{ confirm: true }`                                         | `{ ok }`                   | cascade delete + revoke sessions |
| `updateProfile`   | `{ displayName?, timezone?, notifyEmail?, notifyCadence? }` | `Profile`                  | —                                |


### 6.5 Route Handlers (`/api`)


| Route                  | Method | Auth                | Purpose                      |
| ---------------------- | ------ | ------------------- | ---------------------------- |
| `/api/inngest`         | POST   | Inngest signing key | Inngest function entry point |
| `/api/webhooks/stripe` | POST   | Stripe signature    | subscription lifecycle (P2)  |
| `/api/health`          | GET    | none                | uptime probe                 |


> **Webhook security note:** Stripe and Inngest handlers must verify signatures before doing anything, and must be **idempotent** (store processed event IDs; ignore repeats). A replayed `checkout.session.completed` must not grant a second subscription.

> **Testing tip (API):** for each action write (1) an auth test (no session → `UNAUTHENTICATED`), (2) a validation test (bad input → `VALIDATION`), (3) a tenancy test (another user's id → `NOT_FOUND`, never that user's data), (4) a happy path.

---

## 7. Authentication & Authorization

**Provider:** Supabase Auth. **Methods:** Google OAuth + email magic link. **Session:** Supabase SSR cookies, read in middleware and Server Components.

### 7.1 Flow

1. User signs in (Google or magic link) → Supabase issues a session (JWT in HTTP-only cookie).
2. `middleware.ts` refreshes the session and gates `(app)` routes: no session → redirect `/login`.
3. Server Actions call `supabase.auth.getUser()` (verified) — **never** trust `getSession()` alone for authorization decisions.
4. All DB access runs under the user's JWT so Postgres RLS enforces tenancy as a second, independent layer.

### 7.2 Authorization model

- **App layer:** every action calls `requireUser()` which returns the verified user id or throws `UNAUTHENTICATED`.
- **DB layer:** RLS policies (`user_id = auth.uid()`) are the hard boundary. The app check is convenience; RLS is the guarantee.
- **Two layers on purpose:** an app-layer bug cannot leak data if RLS is correct, and a mis-scoped RLS policy is caught by app-layer ownership checks.

> **Security note:** `getUser()` makes a verified call; `getSession()` reads the cookie without re-verifying. Authorization decisions use `getUser()`. This is the single most common Supabase auth mistake — do not repeat it.

### 7.3 OAuth (Phase 2)

- Request **read-only** scopes only (`gmail.readonly` / Mail.Read). The product cannot send mail or move money by design — the scope makes it impossible, not just policy.
- Store a token *reference*, never the raw token in plaintext (§8.3).
- Provide one-click disconnect that revokes the grant and purges derived facts sourced from that connection if the user chooses.

> **Testing tip:** assert the OAuth consent request lists only read scopes. A test that fails when a write scope sneaks in is a cheap guard against a serious privacy regression.

---

## 8. Privacy & Security Architecture

This section makes the "we see nothing" promise concrete — and honest.

### 8.1 What is stored vs. deleted


| Data                           | Stored?                   | Form                                              |
| ------------------------------ | ------------------------- | ------------------------------------------------- |
| Raw email bodies               | **Never**                 | processed in-memory during a scan, then discarded |
| Raw documents / photos         | **Never**                 | OCR'd in-memory, then discarded                   |
| Passwords                      | **Never**                 | OAuth only                                        |
| OAuth tokens                   | Reference/ciphertext only | §8.3                                              |
| Derived facts                  | Yes                       | `facts` table, encrypted at rest, RLS-isolated    |
| Alerts, activity, billing meta | Yes                       | RLS-isolated                                      |


The scanning pipeline's contract: **extract structured facts → write facts → delete the raw source from memory.** No raw content ever reaches durable storage.

### 8.2 Encryption model

- **At rest:** Postgres/Supabase storage encryption (baseline).
- **Application-layer field encryption:** sensitive `facts` fields (e.g. document numbers in `metadata`) are encrypted with a per-user **data encryption key (DEK)**. DEKs are wrapped by a **key encryption key (KEK)** held in a managed KMS, not in the app database (envelope encryption). A DB breach yields ciphertext + wrapped DEKs, not plaintext.
- **In transit:** TLS everywhere; no personal data in URLs or query strings (it lands in logs) — sensitive identifiers go in the request body.

### 8.3 OAuth token handling (P2)

- Tokens are wrapped with the KMS KEK before any persistence, or delegated to a secrets vault so the app DB never holds a usable token.
- `oauth_connections.access_ref` stores the wrapped handle, never a usable token.
- Scans fetch a short-lived token at run time, use it in memory, discard it.

### 8.4 The honest limit of "zero knowledge" (debated, decided)

Server-side AI reasoning needs **plaintext derived facts** in memory at scan time. So:

- We are **zero-knowledge for raw content** (never stored) and **zero-staff-access** (no human reads your data; access is technically prevented, not just policy).
- We are **not** zero-knowledge for derived facts during processing — the server holds them in memory transiently to reason over them.
- **Resolution:** for users who want true zero-knowledge, Phase 3 ships a **local processing mode** where reasoning runs on-device and nothing leaves the client. The marketing promise is scoped truthfully: *"We never store your emails or documents, and no human at LifeOS can read your data."* Do not overclaim beyond that in copy.

> This is the #1 privacy weak point and it is addressed by being precise, not by hiding it.

### 8.5 The three security holes a startup like this most often misses

1. **RLS gaps via the service role.** Using the Supabase service-role key in a runtime query path bypasses RLS entirely. *Mitigation:* service role is for migrations and webhook handlers only; all user-facing reads/writes run under the user JWT. Add a CI check that greps app routes for service-role usage.
2. **Webhook forgery / replay.** Unverified or non-idempotent Stripe/Inngest handlers let an attacker grant subscriptions or replay events. *Mitigation:* verify signatures; persist processed event IDs; make handlers idempotent.
3. **PII in logs and AI prompts.** Logging full facts, or sending document numbers to the model when the task doesn't need them, leaks data into log sinks and model providers. *Mitigation:* redact before logging; send the model the **minimum** fact fields the task requires (the scan needs dates/amounts/categories, not document numbers).

### 8.6 Audit logging

Every state change and every AI action writes an `activity_log` row (append-only). This is both a user-facing transparency feature and a forensic trail.

### 8.7 Open-source the scanner

The fact-extraction code (the part that reads raw content and decides what to keep) is published so anyone can audit that it deletes raw content. Trust is verifiable, not asked for.

---

## 9. AI Integration Specs

The product calls runtime models from the app and Inngest layer to serve users; those are specified here. The Phase 1 alert engine itself is deterministic and uses no model (§10.2).

### 9.1 Phase 1 — minimal model use

Phase 1's alert engine is **deterministic** (§10.2); the categorization model is optional and cached:

**Job** `categorize` — on fact creation, assign a clean category.

- A small, fast model, called async (Inngest), not in the request path.
- Cost control: skip entirely if the user typed a category; cache by normalized title so "Netflix" is categorized once across all users; cap calls per user per day.
- Logged to `ai_runs`.

```ts
// categorize call (server-side)
const res = await anthropic.messages.create({
  model: CATEGORIZE_MODEL,
  max_tokens: 64,
  system: 'You assign a single lowercase category to a personal life-admin item. ' +
          'Reply with ONLY the category word, no punctuation.',
  messages: [{ role: 'user', content: `Item: "${fact.title}" (type: ${fact.type})` }],
});

```

### 9.2 Phase 2/3 — Runtime life scan

A scheduled Inngest job assembles a user's **derived facts** and asks the reasoning model to reason across all of them, returning strict JSON alerts.

**Cost-disciplined two-stage pattern (decided — this is the right split):**

1. **Pre-filter** reduces the full fact set (e.g. 200) to ~30 candidates worth deep reasoning (anything with an upcoming date, an amount anomaly, or an open thread). Cheap, deterministic-ish, logged.
2. **The reasoning model cross-references** only those ~30: connects a March lease clause to an August deadline, links a recurring charge to an open dispute, self-verifies urgency, and emits alerts.

> Sending all 200 facts to the reasoning model daily is the fast path to negative margins. The pre-filter is not optional; it is the cost architecture.

**Context assembly rules:**

- Send only the fields the task needs: `{id, type, title, category, amount, currency, due_date}`. **Not** document numbers or raw metadata.
- Cap the window: facts relevant to the next N days plus open items, not the entire history every run.

**Runtime prompt contract (reasoning model):**

```
SYSTEM:
You are the reasoning engine for LifeOS. You receive a user's derived life facts as
JSON. Reason across ALL of them together. Identify what is genuinely urgent and
actionable TODAY. For each, self-verify: "Is this real, urgent, and actionable now?"
Drop anything that fails. Return ONLY a JSON array, no prose, matching the schema.
Each alert MUST cite the fact id(s) that justify it in evidence_fact_ids.

SCHEMA (each element):
{ "title": string, "category": string,
  "urgency": "low"|"medium"|"high"|"critical",
  "suggested_action": string, "evidence_fact_ids": string[] }

USER:
{ "today": "<ISO date>", "facts": [ ...derived facts... ] }

```

**Validation (Zod) before anything reaches the DB/UI:**

```ts
const Alert = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  urgency: z.enum(['low','medium','high','critical']),
  suggested_action: z.string().min(1),
  evidence_fact_ids: z.array(z.string().uuid()).min(1),
});
const AlertArray = z.array(Alert);
// Parse model output; on failure -> log ai_runs status='rejected', retry once, then skip.

```

> **Security note:** the model receives derived facts only. If `evidence_fact_ids` contains an id not owned by the user, reject the whole batch — the model hallucinated and the output is untrusted.

> **Testing tip:** golden-file tests with a fixed fact set and a recorded model response; assert the Zod parse succeeds and evidence ids all resolve to real owned facts. Add a "garbage output" test (model returns prose) → pipeline rejects gracefully, no crash.

---

## 10. Background Jobs (Inngest)

All async/scheduled work runs through Inngest: retries, concurrency, and scheduling are handled for you. The single entry point is `/api/inngest`.

### 10.1 Job catalog


| Job                | Trigger                                                   | Phase | Purpose                            |
| ------------------ | --------------------------------------------------------- | ----- | ---------------------------------- |
| `fact.categorize`  | event `fact/created`                                      | P1    | optional categorization            |
| `alerts.recompute` | cron (daily 06:00 user-TZ batched) + event `fact/changed` | P1    | deterministic alert engine         |
| `digest.send`      | cron (per user cadence)                                   | P1    | Resend email digest                |
| `email.scan`       | cron weekly                                               | P2    | fetch → extract facts → delete raw |
| `lifescan.run`     | cron daily/weekly                                         | P2/P3 | pre-filter → reasoning model       |
| `account.purge`    | event `account/delete-requested`                          | P1    | cascade delete + revoke            |


### 10.2 `alerts.recompute` — the deterministic Phase-1 engine

Pure date math + rules; no AI, no per-user cost.

```
For each active fact with a due_date:
  days = due_date - today
  if type in (passport, license, document, insurance, lease) and days <= 30:
      upsert alert(urgency = critical if days<=7 else high,
                   dedupe_key = "expiry:{fact.id}:30")
  if type in (subscription, bill) and due soon:
      upsert alert(urgency = medium, dedupe_key="due:{fact.id}")
Financial-waste rule:
  detect duplicate/overlapping subscriptions by normalized title -> medium alert
Resolution:
  if a fact's date passes or status->resolved, resolve its alerts.

```

- **Idempotency:** every alert is upserted on `dedupe_key`, so re-runs never duplicate.
- **Concurrency:** batch per user; limit `concurrency` so a large user base doesn't spike DB.

### 10.3 `lifescan.run` — Phase 2/3 (the AI scan)

```
1. Load user's derived facts (capped window).
2. Pre-filter -> candidate facts (log ai_runs).
3. Reasoning model over candidates -> JSON alerts (log ai_runs).
4. Zod-validate; verify evidence ids are owned; on failure retry once then skip.
5. Upsert alerts on dedupe_key; write activity rows.

```

- **Retry logic:** network/5xx → exponential backoff (Inngest default), max 3.
- **Failure handling:** a model returning unparseable output is a *handled* outcome (status `rejected`, skip), not a thrown error — never crash the job on bad model output.
- **Concurrency cap:** e.g. `concurrency: { limit: 5 }` on the reasoning step to bound spend and rate-limit exposure.

> **Debugging tip:** if alerts stop appearing → check the Inngest dashboard run history → is `lifescan.run` erroring or being skipped (Zod reject)? → inspect the `ai_runs` row for that run (status + tokens). If `status='rejected'`, the model output broke schema.

> **Testing tip:** Inngest functions are plain async functions — unit-test the step logic directly with a fake fact set and a stubbed model client; reserve a single E2E run for the wired pipeline.

---

## 11. Stripe Integration

Phases 2–3. Free tier needs no Stripe object until upgrade.

### 11.1 Tiers


| Tier        | Price     | Mapped capability                                       |
| ----------- | --------- | ------------------------------------------------------- |
| `free`      | $0        | manual input, deterministic alerts                      |
| `pro`       | $9–12/mo  | email scan, OCR, browser automation, AI life scan weekly|
| `executive` | $19–25/mo | daily scan, voice, autonomy, credits for per-action ops |


### 11.2 Flow

1. Upgrade → create/fetch Stripe Customer → Checkout Session (subscription) → redirect.
2. Stripe → `/api/webhooks/stripe` drives all state. **The webhook is the source of truth, not the client redirect** (the user may close the tab).
3. Billing management via Stripe Customer Portal (no custom card UI = less PCI surface).

### 11.3 Webhook events handled (idempotently)


| Event                           | Action                                                    |
| ------------------------------- | --------------------------------------------------------- |
| `checkout.session.completed`    | activate subscription, set tier, set `current_period_end` |
| `customer.subscription.updated` | sync tier/status/period                                   |
| `customer.subscription.deleted` | downgrade to `free`                                       |
| `invoice.payment_failed`        | mark past-due, notify, grace then downgrade               |


```ts
// Webhook skeleton
const sig = headers().get('stripe-signature')!;
const event = stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET); // verify FIRST
if (await alreadyProcessed(event.id)) return ok();   // idempotency
await handle(event);                                  // service-role write
await markProcessed(event.id);

```

### 11.4 Credit system (P3)

- Expensive per-action ops (phone call, negotiation) debit credits.
- Spend writes a `credit_transactions` row with `balance_after` in the same transaction as the action record. The ledger is the source of truth (§5.8).
- Block the action if `balance_after` would go negative; prompt to top up.

> **Security note:** never trust client-sent prices or tiers. Tier and entitlement come from the `subscriptions` row written by the verified webhook, checked server-side on every gated action.

> **Testing tip:** use Stripe CLI (`stripe listen` / `stripe trigger`) against a local webhook. Test the replay case explicitly: fire the same event twice → exactly one activation.

---

## 12. Service Setup

External services the app depends on. Local development setup (install, env, run) is documented in the README.

- **Supabase:** project + `DATABASE_URL`, anon key, service-role key (server-only).
- **Inngest:** app + signing key; `/api/inngest` endpoint.
- **Resend:** API key for transactional email.
- **Stripe (P2):** keys + webhook secret; Stripe CLI for local testing.
- **Anthropic:** API key for runtime model calls (server-only).

> **Security note:** every secret lives in environment variables, never in the repo. The service-role key and the AI provider key are server-only and must never reach client bundles.

> **Tailwind version:** the major version is locked at project setup (v3). Decide it once and keep components consistent with it.

---

## 13. Full Project Folder Structure

Feature-folder + clean-architecture layering. Domain logic is framework-agnostic; infrastructure (Prisma, Supabase, the AI provider) is isolated behind repositories/services.

```
lifeos/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── (marketing)/page.tsx
│   │   ├── (auth)/{login,signup}/page.tsx
│   │   ├── (app)/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── facts/{page.tsx, new/page.tsx}
│   │   │   ├── activity/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   └── onboarding/page.tsx
│   │   ├── api/
│   │   │   ├── inngest/route.ts
│   │   │   ├── webhooks/stripe/route.ts
│   │   │   └── health/route.ts
│   │   ├── layout.tsx
│   │   └── middleware.ts            # session refresh + route gating
│   ├── features/                    # vertical slices
│   │   ├── facts/{actions.ts, components/, hooks/, schema.ts}
│   │   ├── alerts/{actions.ts, engine.ts, components/, schema.ts}
│   │   ├── activity/
│   │   ├── settings/
│   │   └── billing/                 # P2
│   ├── domain/                      # pure types + business rules, no framework
│   │   ├── fact.ts
│   │   ├── alert.ts
│   │   └── urgency.ts
│   ├── repositories/                # data access (Prisma), one per aggregate
│   │   ├── factRepo.ts
│   │   ├── alertRepo.ts
│   │   └── activityRepo.ts
│   ├── services/                    # infrastructure adapters
│   │   ├── ai/{anthropic.ts, prompts.ts, lifescan.ts}
│   │   ├── auth/requireUser.ts
│   │   ├── email/resend.ts
│   │   └── billing/stripe.ts        # P2
│   ├── inngest/                     # job definitions
│   │   ├── client.ts
│   │   └── functions/{categorize.ts, recompute.ts, digest.ts, lifescan.ts}
│   ├── lib/{db.ts, supabase/, env.ts}   # env.ts validates process.env with Zod
│   ├── types/index.ts
│   └── errors/index.ts              # ErrorCode + typed errors
├── tests/{unit/, integration/, e2e/}
├── .env.local
└── package.json

```

> **Layer rule (enforce in code review):** `features/` may import `domain`, `repositories`, `services`. `domain/` imports nothing app-specific (no Prisma, no Next). `repositories/` is the only place Prisma is touched. This keeps business rules testable without a database and prevents framework lock-in.

---

## 14. Implementation Order

Each step is unblocked by the previous one. Run an architecture review at phase ends.

**Phase 1 — Foundation (Week 1–2)**

1. Project setup: Next.js 14 + TS strict, Tailwind (lock version), ESLint/Prettier, `env.ts` Zod validation. → *verify:* `npm run build` clean, lint clean.
2. Supabase + Prisma: enums, all tables, **RLS policies**, indexes. → *verify:* the cross-user RLS test returns zero rows (§5 testing tip).
3. Auth: Supabase Auth (Google + magic link), `middleware.ts`, `requireUser()`. → *verify:* unauth → `/login`; auth → `/dashboard`.
4. App shell + design system: layout, nav, define the design system. → *verify:* dark/light toggle, empty dashboard renders.
5. Facts CRUD: `createFact/updateFact/deleteFact/listFacts`, forms, Zod both sides. → *verify:* CRUD round-trips; bad input rejected server-side.

**Phase 1 — Core (Week 3–4)** 6. Alert engine (`alerts.recompute`) deterministic, dedupe upserts. → *verify:* expiry within 30d creates exactly one alert; re-run creates none. 7. Alert dashboard: urgency-sorted cards, dismiss/snooze/resolve, activity rows. → *verify:* each action writes one activity row. 8. Memory + Activity views. → *verify:* search/filter/paginate; activity timeline correct. 9. Settings: profile, notification cadence, **data export**, **account deletion (cascade)**. → *verify:* export only caller's rows; delete removes everything. 10. Polish: empty/loading/error states everywhere; digest email. → *verify:* no blank error screens. 11. Architecture review → fix list. Deploy to Vercel.

**Phase 2 — AI (after ~50 active users)** 12. Inngest wired (`/api/inngest`), `ai_runs` logging live. 13. Gmail OAuth (read-only) + `email.scan` (extract → delete raw). → *verify:* no raw content persisted (assert on a fixture). 14. `lifescan.run`: pre-filter → reasoning model → Zod → upsert. → *verify:* golden-file test passes; bad output rejected gracefully. 15. Browser automation (Browserbase + Stagehand) behind approval. Stripe + tiers.

---

## 15. Testing Strategy


| Layer       | Tooling                | What to cover                                                                                     |
| ----------- | ---------------------- | ------------------------------------------------------------------------------------------------- |
| Unit        | Vitest                 | domain rules (urgency, dedupe keys), Zod schemas, alert engine math, repo mappers (mocked Prisma) |
| Integration | Vitest + test Supabase | RLS isolation, server actions auth/validation/tenancy, webhook idempotency                        |
| E2E         | Playwright             | sign-in, add fact → alert appears, snooze/dismiss, export, delete account                         |
| AI          | golden-file            | fixed facts → recorded model output → Zod parse + evidence-id ownership                           |


Per-feature minimums:

- **Auth:** no session → blocked; cross-user id → not-found (never data leak).
- **Alert engine:** deterministic given a fact set; idempotent on re-run.
- **AI pipeline:** valid output parses; garbage output is rejected without crashing.
- **Billing:** duplicate webhook → single activation.

> **Testing principle:** the one test you never skip is **RLS isolation**. If user A can read user B's facts, the product's entire premise is void.

---

## 16. Debugging Guide

Format: *If X → check Y → look at Z.*

**Auth**

- Redirect loop on `/dashboard` → check `middleware.ts` session refresh → look at whether `getUser()` (not `getSession()`) is used for the gate.
- "Logged in but no data" → check the query runs under the user JWT (not service role) → look at RLS policy `user_id = auth.uid()`.

**Data / RLS**

- Empty lists for a real user → check RLS policy exists and matches → look at whether Prisma is using the anon/user client vs service role.
- A query "only works" with service role → that's the bug, not the fix → look at the missing/incorrect RLS policy.

**Alerts**

- Duplicate alerts each day → check `dedupe_key` is set and unique-indexed → look at `alerts.recompute` upsert logic.
- Alerts never appear → check `alerts.recompute` ran (Inngest dashboard) → look at whether facts have `due_date` set.

**AI pipeline (P2)**

- No AI alerts → check `lifescan.run` in Inngest history → look at the `ai_runs` row: `status='rejected'` means schema break; `status='error'` means API/network.
- Wrong fact cited → check `evidence_fact_ids` in output → look at the context-assembly query (are you sending the right facts?).
- Cost spike → check assembled context size → look at whether the pre-filter ran (all facts going straight to the reasoning model is the cause).

**Billing**

- Double subscription → check webhook idempotency (processed-event store) → look at whether you act on the client redirect instead of the webhook.

---

## 17. Security Checklist

Review before every deploy. Any unchecked item blocks the deploy.

- [ ] RLS enabled on **every** user-owned table; cross-user read test passes.
- [ ] Service-role key used **only** in migrations + webhook handlers; not in user query paths (CI grep).
- [ ] All Server Actions call `requireUser()` and Zod-validate input.
- [ ] `getUser()` (verified) used for authorization, never `getSession()` alone.
- [ ] OAuth scopes are **read-only**; a test fails if a write scope appears.
- [ ] No raw email/document content persisted anywhere; scanner deletes raw in-memory.
- [ ] OAuth tokens stored only as wrapped references (KMS/vault), never plaintext.
- [ ] Secrets in env vars only; service-role + AI provider keys absent from client bundles.
- [ ] Stripe/Inngest webhooks verify signatures and are idempotent.
- [ ] No PII in logs or URLs; model prompts carry the minimum fact fields only.
- [ ] `activity_log` is append-only (no client insert/update/delete policy).
- [ ] Account deletion cascades and revokes sessions.
- [ ] AI evidence ids validated as owned by the user before persisting alerts.

---

## 18. Performance Considerations

- **Indexes (§5):** `facts(user_id, due_date)` powers the alert engine's main scan; `(user_id, type)` and `(user_id, status)` power Memory filters; GIN on `metadata` for jsonb search; `alerts(user_id, status, urgency)` for the dashboard.
- **Reads in RSC:** dashboard/memory data fetched server-side; client uses TanStack Query only where optimism/caching helps (fact create, alert actions).
- **Inngest concurrency:** cap reasoning steps (e.g. `limit: 5`) to bound spend and rate-limit exposure; batch `alerts.recompute` per user.
- **Caching:** the `categorize` job is cached by normalized title (cross-user) — most common items are categorized once, not per user.
- **Pagination:** all lists are server-paginated; never load a user's full history into one response.
- **Rate limits:** per-user caps on AI-triggering actions; the deterministic engine has no AI cost and can run freely.

> **Debugging tip:** slow dashboard → check the query plan uses `alerts_user_status_idx` → look at whether you're filtering in JS after over-fetching (push filters to SQL).

---

## 19. Cost Management

**Phase 1 stays ~$0:**

- Alert engine is deterministic — zero AI cost.
- The `categorize` job is optional, cached, and daily-capped per user.
- Free tiers: Vercel, Supabase, Resend.

**Phase 2/3 margin protection:**

- **Model choice:** a lighter model for pre-filtering and routine reasoning; the strongest model only for the final cross-reference over ~30 candidates. This split is the core cost architecture.
- **Cadence is the lever:** weekly scans for Pro, daily for Executive; never real-time.
- **Observability:** every model call writes `ai_runs(model, tokens, cost_usd)`. A daily rollup per user surfaces anomalies.
- **Alerts:** set a per-user daily cost threshold; if exceeded, pause that user's AI jobs and flag — a spike is almost always a context-assembly bug, not real demand.
- **Unit economics target:** Pro ~$3–5/user, Executive ~$8–12/user, both profitable at the stated price points.

> **Rule:** runtime model choice is fixed by the §9 architecture; don't escalate to the strongest model to paper over a pre-filter bug.

---

## 20. Future Expansion Roadmap

- **Phase 4 — Proactive autonomy:** with accumulated trust, pre-approved categories execute without per-action confirmation (already enabled by `alerts` + approval model).
- **Local-first zero-knowledge:** expand the §8.4 on-device mode to the default for privacy-max users; server only ever sees ciphertext.
- **Shared households:** multi-user facts (shared lease, family insurance) — the `user_id` tenancy generalizes to an `account_id` with membership, an additive change.
- **Open ecosystem:** publish the fact schema so third parties can write derived facts (read-only, user-approved) into LifeOS.
- **Financial optimization engine:** the `facts` + `ai_runs` foundation supports recommendation features (cheaper insurance, unused subscriptions) without new core architecture.

The architecture deliberately makes these additive: new sources slot into `facts.source`, new reasoning slots into the scan pipeline, new tenancy slots into the existing `user_id` boundary. None requires a destructive migration.

---

*End of LifeOS TRD v1.0.*
