# Contributing

A short guide to how we build LifeOS. The goal is that a change reads like the code around
it and upholds the trust guarantees the product is built on.

## Workflow

1. **Plan before a non-trivial change.** List the files you expect to touch, the approach,
   and the risks. Keep the change surgical — touch only what the task needs.
2. **Build, then verify.** Run `npm run verify` (typecheck + lint + build). Remove debug code
   before you open a PR.
3. **Write a real commit message.** Describe what changed and why in plain language.

## Conventions

- **Mutations are Server Actions; external callers use Route Handlers** under `src/app/api/`.
- Every action result is `{ ok: true, data } | { ok: false, error: { code, message } }`.
- Lists are server-paginated. We don't fetch full history into the client.
- Alerts upsert on `dedupe_key` — never insert a duplicate.
- Step-up re-auth guards data export and account deletion. Export streams; it never persists
  to storage.
- Email digests carry counts and titles only — never amounts, dates, or document details.

## Code style

- TypeScript strict mode. Prefer precise types over `any`.
- Single quotes, two-space indentation, no semicolons where the formatter omits them — run
  `npm run format` (Prettier) and let it settle style questions.
- Name things for what they are in the domain (`renewingSoon`, `factRepo`, `dedupeKey`), not
  generically (`data`, `handler`, `item`).
- Every `catch` block produces a meaningful, user-safe message and logs the real detail
  server-side. No silent or empty catches.
- Lucide icons only, 24 viewBox, 1.5 stroke. No emojis in the UI.

## Design system

The UI target is "quiet relief": within a few seconds of opening the dashboard the user
should feel that something competent is already watching their admin so they can stop holding
it in their head. The full token set, urgency scale, and trust rules live in the design notes;
the load-bearing rules are:

- Soft minimalism with opaque bento cards (`rounded-2xl`, 1px border, soft shadow). Glass is
  an accent on floating chrome only, never on content cards.
- One accent color, two typefaces, tabular numerals on all amounts and dates.
- 4.5:1 contrast minimum everywhere — legibility is part of the trust promise.
- No manufactured urgency: no red badge counts, no pulsing, no streaks, no confetti.
- Every AI-surfaced alert renders its evidence ("from: Netflix subscription"). Insight without
  provenance is not allowed to ship.
- Zero layout shift: skeletons reserve exact space; async content never jumps.
- Motion is 150–250ms, ease-out, transform/opacity only, and respects
  `prefers-reduced-motion`.

## Things we don't do

- Use `getSession()` for an auth decision (use `getUser()`).
- Put the service-role key in a user query path (including via Prisma — it bypasses RLS).
- Return raw email or document content from an Inngest step.
- Persist raw content anywhere, ever.
- Treat a prompt rule as a security control — the validator in code is the control.
- Ship an alert UI that can't show its evidence.
