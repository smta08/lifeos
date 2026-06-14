# Security

Security is a product feature here, not a checklist. The promise we make to users is
"LifeOS sees everything, we see nothing," and the rules below are what make that promise
true. They are non-negotiable.

## Data minimization

- We never persist raw emails, documents, or credentials. We extract the derived facts we
  need and discard the source material in the same operation.
- We use OAuth with read-only scopes only. We never ask for or store a password.
- Scan-pipeline errors are scrubbed before they are logged or rethrown: a message id and an
  error class, never content. There is no `console.*` logging in the AI service or scan
  pipeline.

## Authentication and authorization

- Every Server Action calls `requireUser()` as its first line. There are no exceptions.
- Authorization decisions use Supabase `getUser()`, which validates the JWT against the auth
  server. We never make an authorization decision from `getSession()` alone.
- Protected routes are gated in middleware, which also runs `getUser()` rather than trusting
  a cookie at face value.

## Tenancy isolation (RLS)

- Every user-owned table has a `user_id` column and an RLS policy of `user_id = auth.uid()`.
  RLS is the hard boundary between tenants.
- We never disable RLS to make a query work. If a query only succeeds with RLS off, the query
  is the bug and we fix the query.
- The service-role key is used only in migrations and webhook handlers. It never appears in a
  user query path — and that explicitly includes Prisma, whose default connection bypasses RLS.
- The isolation test we never skip: user A must never be able to read user B's rows. It runs
  through the repository layer (the real query path), not a raw client.

## Input handling

- All user input and URL parameters are validated with Zod on the server, not only on the
  client.
- Database access goes through Prisma or the Supabase client exclusively. There is no raw,
  string-concatenated SQL anywhere, so there is no SQL injection surface.
- We do not inject user-supplied content as raw HTML. There is no `dangerouslySetInnerHTML`
  fed by user data; if raw HTML ever became necessary we would sanitize it first.
- Sensitive values (document, account, and policy numbers) are envelope-encrypted and stored
  in `facts.sensitive`, never in indexed `metadata`. They are masked in the UI by default
  (e.g. `•••• 4417`) and never placed in URLs, page titles, or toasts.

## Webhooks

- We verify the signature first, then check idempotency, then process. The order matters.
- Idempotency is enforced by an `INSERT … ON CONFLICT DO NOTHING` into `webhook_events`;
  zero rows inserted means a replay, and we return 200 and stop.

## AI-pipeline guards

These are security-relevant and not optional:

- No pipeline step returns raw email or document content, because Inngest memoizes step
  output and would persist it.
- The phishing validator runs in code after Zod parsing. Scanned email is attacker-controlled
  input; prompt instructions are never treated as a control.
- Evidence ids not owned by the requesting user reject the whole batch.
- The cross-user categorization cache is used only for allowlisted simple titles (a single
  brand token, no digits or emails); everything else caches per user.
- Browser automation navigates only to allowlisted provider domains, never to a URL that
  originated in scanned content.

## Transport and headers

- Production traffic is HTTPS only; no resource is loaded over plain HTTP in a production
  context.
- We send `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, and a restrictive `Permissions-Policy` on every response (configured in
  `next.config.mjs`).
- This is a same-origin application. We do not enable wildcard CORS; the browser's same-origin
  policy is the intended default.

## Secrets

- No secret is hardcoded in source. Every secret lives in an environment variable, documented
  in `.env.example`, and `.gitignore` excludes all `.env*` files.
- Step-up re-authentication is required for data export and account deletion. Export streams
  to the client and is never written to storage.
