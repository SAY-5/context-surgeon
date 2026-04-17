# Memory Index

Auto-accumulated notes. The first 200 lines (or 25KB, whichever first)
load at the start of every session. Anything below that cut is only
read on demand via `/memory`.

## User profile

- user is a staff platform engineer; deep TypeScript background, passing
  familiarity with Rust; currently splitting time between payment
  reliability work and the Turborepo migration of the remaining apps
- prefers concise pr reviews; "if it's blocking, block; otherwise nit:"
- does not use the Anthropic Console prompt improver; said it "rewrites
  things in a voice that isn't mine"
- runs `pnpm test` from the repo root for the fast path; uses
  `pnpm --filter` when working inside a single package

## Build commands that worked

- `pnpm i --frozen-lockfile && pnpm build` — canonical CI-equivalent
  local build. Takes ~2m30s on a clean cache, ~12s incremental.
- `pnpm --filter @acme/api typecheck` — scoped typecheck. Fast.
- `pnpm --filter @acme/web dev` — next 15 dev server. Port 3000.
- `pnpm --filter @acme/api dev` — fastify with tsx watch. Port 4000.
- `pnpm --filter @acme/worker dev` — bullmq worker. Needs redis.
- `pnpm dx:reset` — nukes node_modules, .turbo, .next, dist. Useful when
  something is weird and the caches are suspect.
- `pnpm --filter @acme/db migrate:dev --name <slug>` — Prisma migration.
- `pnpm --filter @acme/db studio` — prisma studio, port 5555.
- `pnpm bench` — app-level benchmarks under `benchmarks/`.
- `docker compose up -d` from repo root — spins up postgres + redis +
  the local mailhog. Data persists in `.devdata/`.

## Debug recipes

### "prisma client is out of sync"

Cause: somebody added a migration but forgot to commit the generated
client under `packages/db/generated/`. Or you pulled and forgot to
regenerate.

Fix: `pnpm --filter @acme/db generate`. Commit the regenerated client
if it changed.

### "cannot find module '@acme/xxx'"

Cause: a new package was added but the workspace was not re-installed.

Fix: `pnpm install` from the repo root.

### "type X is not assignable to Y" after a prisma migration

Cause: Prisma client out of sync with the schema.

Fix: `pnpm --filter @acme/db generate`, then re-run typecheck.

### "integration test times out"

Cause: testcontainers cannot start a docker container within the
vitest timeout. Usually means Docker Desktop is not running or the
image is not cached locally.

Fix: make sure docker is running; `docker pull postgres:15` once to
cache. If still slow, bump the test timeout on the specific suite
rather than globally.

### "the next dev server hot-reloads forever"

Cause: a file is being rewritten in a loop by a formatter. Usually
prettier on save + eslint auto-fix disagreeing.

Fix: check `.vscode/settings.json`; pick one autofix source of truth
(we default to prettier on save, eslint on command).

### "stripe webhook 400s locally"

Cause: webhook signing secret in Doppler is for staging, not local.

Fix: set `STRIPE_WEBHOOK_SECRET_LOCAL` from the Stripe CLI listener
output; the code prefers `_LOCAL` if present.

### "redis connection refused in worker"

Cause: bullmq tries to connect before docker-compose starts redis.

Fix: `docker compose up -d redis && sleep 1 && pnpm --filter @acme/worker dev`.

## Architecture notes

- package dependency graph: nothing in packages/ depends on apps/. If
  you find a cycle, fix it at the package level, not the app level.
- the api exposes graphql over http at /graphql; there is no rest api
  surface (an internal admin rest endpoint exists at /admin/ops/* but
  that's internal only, auth-required, IP-allowlisted)
- prisma client is generated to `packages/db/generated/`. It is
  committed to git so CI does not have to regenerate it. This is
  unusual; the rationale is in ADR-0017.
- the worker consumes from three queues: `invoices`, `webhooks`, and
  `exports`. Each has its own concurrency cap set in `apps/worker/src/config.ts`.
- `packages/integrations/` wraps stripe, segment, resend, intercom,
  snowflake, launchdarkly, sentry. Every wrapper exposes a typed
  interface that business logic imports, not the vendor sdk.

## Gotchas

- `process.env.NODE_ENV` is `"production"` in preview deploys. Do not
  gate "only run in prod" code on it; use `process.env.DEPLOY_STAGE`
  which is `"preview"` | `"staging"` | `"production"`.
- `findFirst` is not indexed unless the filter is on an indexed column;
  prefer `findUnique` when you have a unique key.
- TanStack Query `staleTime: 0` means "refetch on every render,"
  rarely what you want. Default in the code is 5 minutes.
- clerk's middleware must run before any of our auth helpers; the
  order in `apps/web/middleware.ts` matters.
- `noUncheckedIndexedAccess: true` makes `array[0]` return `T | undefined`.
  This surprises a lot of code ported from elsewhere. Use `.at(0)` or
  narrow explicitly.
- the prisma client is committed; do not `.gitignore` the generated
  directory. The tooling assumes it is present.
- `pnpm add` without `--filter` adds to the root workspace. It is
  almost always wrong; use `--filter`.

## Fixes that worked (pattern file)

- invoice webhook out-of-order delivery: process the webhook by event
  id rather than in arrival order; persist the last-processed id per
  invoice; drop stale events. (see ADR-0033)
- retry storm on resend: circuit breaker with a 30s half-open window;
  dropped weekly retry spikes from ~2k to ~12.
- graphql N+1 in `billingAccounts`: dataloader per-request cache,
  batched by `accountId`; dropped p99 from 4.8s to 280ms.
- next 15 "cannot use import as client component" error: added
  `'use client'` to the component that uses `useState`; the compiler
  is stricter than next 14.
- flaky integration test for webhook signatures: stop mocking `Date.now`
  in the stripe wrapper; use real time; the test runs in <50ms anyway.

## Team preferences discovered

- prefers small, frequent prs over large batch ones — opens drafts
  early, keeps them under ~400 changed lines, lands one at a time
- does not like being asked "do you want me to continue?" every two
  steps; prefers a plan up front, then execution
- is fine with fast iteration on plain-js prototypes but expects any
  merged code to be strict-ts-clean
- reviewer gets grumpy about unexplained `@ts-ignore`; always explain
  the disable inline

## Rollback recipes

### api deploy caused 5xx spike

1. `gh workflow run rollback-api --ref main -f sha=<previous-sha>`
2. watch `#inc` for the rollback confirmation (takes ~90s)
3. after rollback, run `pnpm --filter @acme/api validate-staging` to
   make sure staging didn't drift
4. open a PIR ticket using the template in `docs/incidents/template.md`

### prisma migration wrong

1. if already in production: write a forward-fix migration. Do not
   `migrate:rollback` in production.
2. if in staging: `pnpm --filter @acme/db migrate:reset` + re-apply
   corrected migration.

### web deploy introduced a crash loop

1. vercel dashboard → deployments → find last-known-good → "promote
   to production."
2. post-promote, investigate why the bad deploy slipped past the preview
   smoke tests; the smoke tests should have caught it.

## Feature flag discipline

- every new feature ships behind a flag. even "tiny" changes if they
  touch the billing flow.
- flags are created in launchdarkly before the code lands, not after.
- flag names are `<team>-<feature>-<verb>` — `billing-dunning-v2-enabled`,
  `growth-ref-link-copy-rollout`.
- deleting a flag: set default to the desired value, wait two weeks,
  then remove from the code in a dedicated PR.

## Observability

- metrics: datadog. the dashboards are in the "platform" folder.
- logs: datadog log management, with correlation-id search enabled.
- traces: datadog apm; every async boundary carries a trace id via
  asynclocalstorage.
- errors: sentry. the alert rules are in `ops/sentry/alerts.yaml`.
- feature-flag exposure is emitted as a structured log line so we can
  correlate flag state to observed behaviour.

## Slow queries we have seen and what we did

- `SELECT * FROM invoices WHERE account_id = $1 AND status = 'paid'
   ORDER BY created_at DESC LIMIT 50` — added a composite index on
   (account_id, status, created_at DESC). p99 11s → 42ms.
- recursive cte for account hierarchy — rewrote as iterative join;
  p99 dropped 8x. Saved the rewrite as a pattern in
  `docs/db/patterns/hierarchy.md`.
- `includeRelation: true` in graphql resolver that pulled a 50k-row
  join — replaced with a dedicated query that paginates and projects
  only the needed columns.

## Things we tried and stopped doing

- decorrelated jitter on retries — hurt our workload; full jitter with
  30s cap is better.
- prisma raw sql for "performance" — Prisma's generated SQL is good;
  raw SQL costs more in maintenance than it saves in speed.
- mocked testcontainers in integration tests — the number of real bugs
  caught by the non-mocked version is not small; the "it's slow" cost
  is the cost of the tests doing real work.
- ESLint auto-fix on save — conflicted with prettier in subtle ways;
  we run eslint manually or in CI only.

## Ops runbook pointers

- oncall rotation: #oncall pinned message.
- sev2+ incident: declare in #inc, spin up a zoom. commander ≠
  investigator.
- paging a human after hours: pagerduty schedule "platform-prod."
- security concerns: #security private channel; do not discuss in a
  customer-visible channel.

## Keyboard shortcuts and dev tools

- vscode tasks are defined in `.vscode/tasks.json`; cmd-shift-b runs
  the default (typecheck).
- dev uses the "acme-dev" container in docker; `make shell` opens a
  shell inside it.
- linear shortcut for the team: acme.linear.app/team/PLATFORM.
