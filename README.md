# LifeOS

An AI-assisted operating system for personal life admin. LifeOS watches the boring,
easy-to-forget parts of life — subscription renewals, insurance and document expiries,
bills, and disputes — and surfaces what needs the user's attention before it becomes a
problem. With explicit approval, it can act on those items.

The product is built privacy-first. It connects with read-only OAuth, extracts only the
facts it needs, and discards the source material. The guiding promise is *"LifeOS sees
everything, we see nothing."*

> Status: Phase 1. The alert engine is deterministic date math; the AI life-scan pipeline
> is being layered in behind it.

## Features

- **Facts** — track subscriptions, policies, and documents, manually or by scanning.
- **Deterministic alert engine** — flags expiries and renewals with no model in the loop,
  so alerts are predictable and explainable.
- **Document scanner** — extracts fields from PDFs and images in the browser (pdf.js + OCR);
  raw files are parsed in memory and never uploaded.
- **Gmail scan** — read-only OAuth; messages are fetched and parsed client-side into derived
  facts, then discarded.
- **Dashboard** — a calm overview of spending, upcoming renewals, and anything that needs you,
  with provenance on every alert.

## Tech stack

Next.js 14 (App Router, Server Actions) · TypeScript · Tailwind CSS · shadcn/ui ·
Framer Motion · TanStack Query · React Hook Form + Zod · Supabase (Postgres, Auth) ·
Prisma (migrations) · Inngest · Resend · Anthropic API.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the module boundaries and data-access
model, and [docs/SECURITY.md](docs/SECURITY.md) for the security guarantees.

## Prerequisites

- Node.js 18.18+ (or 20+)
- npm
- A [Supabase](https://supabase.com) project (free tier is fine)

## Getting started

```bash
# 1. Install dependencies (also generates the Prisma client and copies the pdf.js worker)
npm install

# 2. Configure environment
cp .env.example .env.local
# then fill in the values described below

# 3. Apply the database schema
npm run db:push

# 4. Run the dev server
npm run dev
```

The app runs at http://localhost:3000.

## Environment variables

Copy `.env.example` to `.env.local` and fill it in. Every variable is documented there; the
essentials to get the app running locally are:

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon key (browser-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-only key for migrations and webhooks |
| `DATABASE_URL` / `DIRECT_URL` | yes | Pooled and direct Postgres connection strings |
| `NEXT_PUBLIC_APP_URL` | prod | Canonical app origin for OAuth redirects and email links |
| `ANTHROPIC_API_KEY` | optional | Enables the Phase 2+ AI scan pipeline |
| `INNGEST_*` | optional | Background jobs |
| `RESEND_API_KEY` | optional | Digest emails |
| `STRIPE_*` | optional | Phase 3 billing |

`NEXT_PUBLIC_APP_URL` is only required in production. Locally it falls back to
`http://localhost:3000`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run verify` | typecheck + lint + build (run before pushing) |
| `npm run format` | Prettier |
| `npm run db:push` | Push the Prisma schema to the database |
| `npm run db:migrate` | Create and apply a migration |

## Deployment (Vercel)

1. Push the repo to GitHub and import it into [Vercel](https://vercel.com).
2. Add every variable from `.env.example` in the Vercel project settings, and set
   `NEXT_PUBLIC_APP_URL` to the production domain (no trailing slash).
3. Add that same domain to the Supabase Auth redirect allowlist so OAuth callbacks resolve.
4. Deploy. Vercel runs `npm install` and `npm run build` automatically.

## Project layout

```
src/
  domain/        pure types and business rules (no framework imports)
  repositories/  the only place the DB client is touched
  services/      infrastructure adapters (auth, ai, email, billing)
  features/      UI + Server Actions per product area
  app/           Next.js App Router routes
docs/            architecture, security, database, and contributing notes
prisma/          schema and migrations
```

## License

Private project.
