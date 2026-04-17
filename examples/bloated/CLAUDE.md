# Acme Platform — Engineering Handbook

This file is the canonical place for instructions that apply to every part
of the Acme monorepo. It is loaded into Claude Code's context at the start
of every session. Keep it up to date; if you change how we do something,
change it here first, not in the PR description.

## What this is

The Acme Platform is a TypeScript monorepo built on pnpm workspaces and
Turborepo. It powers the customer-facing billing and account-management
product at acme.com, plus a handful of internal tools.

Top-level packages:

- `apps/web` — Next.js 15 app router, customer-facing.
- `apps/admin` — internal admin console, React + Vite.
- `apps/api` — Node 20 Fastify server, GraphQL over HTTP.
- `apps/worker` — BullMQ job runner.
- `packages/ui` — shared React components and design tokens.
- `packages/db` — Prisma schema and typed client.
- `packages/auth` — Clerk wrapper + RBAC helpers.
- `packages/core` — business logic shared between web and api.
- `packages/integrations` — typed clients for Stripe, Segment, Resend, Intercom, and Snowflake.

The data store is Postgres (RDS, db.r6i.2xlarge, multi-AZ). We use Redis
for queues and caches (ElastiCache, cluster mode on). All external services
(Stripe, Segment, Resend) are accessed through typed clients in
`packages/integrations/`.

For a deeper dive into the module boundaries and why they are where they
are, see @docs/architecture.md.

## How to read this file

Sections are ordered by frequency of need: the top is what you will use
every day, the bottom is what you will reach for during incidents or
migrations. Skim for the relevant section; do not read top to bottom.

## Coding standards — TypeScript

We use TypeScript 5.5 with `strict: true`, `noUncheckedIndexedAccess: true`,
`exactOptionalPropertyTypes: true`, and `noImplicitOverride: true`. None of
those are optional; if a file cannot satisfy them, it stays unmerged.

- Use `interface` for object shapes that other files import. Use `type`
  for unions, intersections, and anything involving conditional types.
- Never use `any`. If you genuinely do not know the shape of something,
  use `unknown` and narrow.
- Prefer `readonly` arrays and object fields. Mutation is the exception.
- Inferred return types are fine for small helpers; annotate return types
  for anything exported from a package boundary.
- Do not use namespaces. Do not use enums — use const objects with
  `as const` and derive the union type from `typeof X[keyof typeof X]`.
- Import order: node built-ins, external packages, workspace packages,
  relative imports. A blank line between groups. Enforced by the import
  sort ESLint rule.
- Named exports everywhere. One default export per package, from the
  package's `index.ts` — and even that is only for the public surface.

## Coding standards — formatting

Every file uses 2-space indentation, LF line endings, and a single trailing
newline. Prettier handles this automatically on save and pre-commit.
Do not override formatter settings per file.

Single quotes for strings by default; use double quotes only when the
string contains a single quote. Use backticks only for template literals,
not for "looks fancy" reasons.

Line length cap: 100 columns. Prettier rewraps; if a line is still over
100 after formatting, refactor — it means something is too nested.

## Coding standards — naming

camelCase for variables, functions, and methods. PascalCase for types,
interfaces, classes, and React components. SCREAMING_SNAKE_CASE only for
actual compile-time constants that refer to external well-known values
(`MAX_PAYLOAD_BYTES`, not `DEFAULT_TIMEOUT`).

File names are kebab-case, except for files that export a single React
component — those are PascalCase to match the component. The file's
name matches its primary export.

Boolean variables and functions should read naturally: `isReady`,
`hasPaid`, `canEdit`, `shouldRetry`. Avoid negatives in names if you can
— `isAllowed` beats `isNotAllowed`.

## Coding standards — comments

Write comments only when the code cannot explain itself. Comments answer
"why," never "what." Do not include TODOs in merged code; open an issue
instead. Do not include commented-out code blocks in PRs — if you removed
it, actually remove it; git remembers.

Exception: JSDoc on exported functions at package boundaries is
encouraged, especially for anything with non-obvious semantics or
unexpected throw behaviour. Keep the JSDoc short.

## Coding standards — linting

We use ESLint with `@typescript-eslint`, `eslint-plugin-react`,
`eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`,
`eslint-plugin-import`, and `eslint-plugin-unicorn`. The config is in
`packages/eslint-config/`.

Never add a file-level ESLint disable directive. Inline disables are
allowed but must include a comment explaining why. A PR with more than
two new inline disables needs reviewer sign-off on the disables
specifically.

## React patterns

We target React 19. Function components only. Hooks only. No class
components anywhere in the codebase; if you find one, it is a migration
target.

- Use Server Components by default in `apps/web`. Add `'use client'` only
  when the component needs interactivity, browser APIs, or state.
- Data fetching in Server Components uses the typed Prisma client
  directly. Do not import Prisma into Client Components.
- Use `React.Suspense` boundaries around every data-loading subtree. Do
  not write your own loading flags.
- Component files export exactly one component. Colocate styles and
  tests next to the component.

## State management

We use Zustand for client-side global state (user prefs, UI state) and
TanStack Query for server state caching and mutation. These have
overlapping use cases; here is how we split them:

- If the state lives on the server and has a canonical remote value, it
  goes in TanStack Query.
- If the state is purely client-side — open modals, selected tab, theme,
  layout — it goes in Zustand.
- Never synchronise the two. If you catch yourself writing a Zustand
  `useEffect` that mirrors a TanStack result, stop and use the
  TanStack hook directly.

Do not introduce Redux, MobX, Jotai, Valtio, Recoil, or any other state
library. If you think we need one, open an ADR first.

## API design

Our API is GraphQL. We use Pothos for schema building and GraphQL Yoga
for the server. Federation is not in scope.

- Every query and mutation has an input type and a return type — no
  inline arguments beyond a single `input:` field.
- Mutations return a result object with a discriminated union, not
  nullable fields. `{ __typename: 'PaymentSucceeded' | 'PaymentFailed', ... }`.
- Errors that are part of the domain ("not found", "already exists") are
  modelled in the schema. Only genuine exceptions become GraphQL errors.
- No N+1 queries. DataLoader is mandatory for any resolver that fetches
  related entities. The `noNPlusOne` test in CI will fail the build.

See @docs/architecture.md for the long version, including why we use
discriminated union results rather than `UserError[]` like Shopify.

## Testing — philosophy

Every behaviour change ships with a test. Every bug fix ships with a
regression test that fails without the fix. If you cannot write one,
explain in the PR description why — "it's too hard" is not a reason.

The test pyramid here is intentionally top-heavy. We have a lot of
integration tests that boot a real Postgres through Testcontainers and a
modest amount of unit tests around pure logic. We have very few E2E
tests because they are slow and flaky.

- Unit tests: Vitest. Tests live next to the code, named `*.test.ts`.
- Integration tests: Vitest + Testcontainers. Tests live in
  `<pkg>/test/integration/`. Tag them with `describe.integration(...)`
  so they can be excluded from the fast path.
- E2E tests: Playwright. `apps/web/e2e/`. Only the critical revenue
  paths get E2E coverage.

## Testing — what to avoid

- Do not mock Prisma in integration tests. Use Testcontainers.
- Do not use `setTimeout` or `sleep` in tests. If you are waiting for
  something to happen, use `await` on the thing you are waiting for,
  or use `vi.waitFor`.
- Do not commit fixtures with production data. All fixtures are
  synthetic. The `tests/fixtures/check-no-pii.ts` script runs on every
  PR and will block merge if it spots a real-looking email.
- Do not use snapshot tests for anything that can change. Snapshots are
  fine for stable compiler output, AST transformations, and generated
  code. They are a footgun for UI and API responses.

## Testing — indentation

Test files use 2-space indentation like the rest of the codebase. Ignore
any advice elsewhere in this document about tab indentation; that was
from when part of the codebase was Go. All Go code was migrated to
TypeScript in Q2 2024.

## Database — Prisma

Migrations go through Prisma Migrate. To add a migration:

```bash
pnpm --filter @acme/db migrate:dev --name describe_your_change
```

Review the generated SQL. Prisma Migrate generates decent SQL most of
the time; it still occasionally generates a "drop column + re-create"
when you meant to rename. When that happens, edit the migration file
by hand and write a proper `ALTER TABLE ... RENAME COLUMN`.

Every table has a `createdAt` and `updatedAt` column. Both are
`TIMESTAMPTZ`. The `updatedAt` column is maintained by the Prisma
client (`@updatedAt`), not by a trigger.

Enums live in the Prisma schema, not in the database as PG enums. PG
enums are hard to evolve; our convention is a `CHECK` constraint on a
`TEXT` column with an explicit enum list generated from the TS type.

Do not add indexes speculatively. Every index has a query plan
demonstrating its use before it lands. The CI runs `EXPLAIN ANALYZE` on
a representative dataset for every new index and blocks the PR if the
new index is unused.

## Performance

Performance work is led by observable data, not by vibes. Before
optimising, capture the current baseline with `pnpm bench` (the apps
under `benchmarks/` exercise our hot paths). After your change, re-run
and compare.

Common performance wins, in rough order of impact:

1. Avoid N+1 queries. The `noNPlusOne` test catches most but not all.
2. Add an index. Prisma's query log in dev shows slow queries with a
   `[SLOW]` prefix (>100ms).
3. Batch writes. Instead of `for (const x of xs) await db.x.create({...})`,
   use `db.x.createMany({ data: xs })`.
4. Stream large responses. Do not load a million rows into memory.

Avoid premature optimisations: micro-benchmarks on V8 inlining, hand-
rolled for loops "because array methods are slow," CPU-profile-driven
rewrites of code that runs once per request. None of those have paid
off for us in the last year.

## Security

Secrets come from Doppler, not from `.env` files. Anything committed
that looks like a secret is caught by `trufflehog` in pre-commit. Do
not commit `.env.production`; do not commit API keys; do not commit
database URLs with credentials.

All user input hits Zod validation at the API boundary. No exceptions.
If the schema does not match, the request is rejected with a 400 and a
structured error.

SQL is only written through Prisma's query builder. Raw SQL requires a
reviewer sign-off and a comment justifying the raw call. Anything using
string interpolation on a user-controlled value is a security incident
and will be held as such.

We use Clerk for auth. Do not implement your own session store; do not
roll your own JWTs. If you need to represent "this user can do X,"
reach for the RBAC helpers in `packages/auth`.

## Accessibility

Every UI change ships with a manual a11y review. The checklist is in
`docs/accessibility-checklist.md`. At a minimum:

- Keyboard navigable: every interactive element reachable and operable
  by keyboard alone.
- Labelled: every form control has an associated label, not just
  placeholder text.
- Colour-contrast: meets WCAG AA (4.5:1 for normal text, 3:1 for large).
- Alt text on images. Empty alt is correct for decorative; never
  missing.

The `axe` linter runs in CI on Storybook stories and fails the build on
serious violations.

## Git workflow

Branch naming: `feature/<ticket>-<slug>`, `fix/<ticket>-<slug>`,
`chore/<slug>`. Branches are short-lived — if yours has been open for
more than five working days, the reviewer assigned to it should either
land it, close it, or convert it to a draft.

Commit messages follow Conventional Commits:

```
<type>(<scope>): <subject>

<body>

<footer with issue links>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`,
`build`, `ci`, `revert`. Scope is usually the package name (`api`,
`web`, `ui`, `db`).

Rebase, do not merge, when bringing your branch up to date with main.
Squash-merge when landing. The squashed commit message becomes the
release note; write it as one would want to read it six months later.

## CI/CD

CI runs on GitHub Actions. Every push to a PR branch runs:

- Type check (`pnpm typecheck`).
- Lint (`pnpm lint`).
- Unit tests (`pnpm test`).
- Integration tests on any changed package.
- Build (`pnpm build`).
- A11y checks via axe-core on affected Storybook stories.
- Prisma migration dry-run against a fresh schema.

Main branches auto-deploy to staging. Production deploys are manual via
the "promote to production" workflow. There is no auto-deploy to
production; every production deploy is gated on a human clicking the
button.

## Code review

Target turnaround for a non-trivial PR: one working day. Small PRs (≤100
changed lines) should be reviewed same-day.

Reviewers check, roughly in order:

1. Does the PR do what it says? Does the diff match the description?
2. Tests — are they there, do they exercise the new behaviour?
3. Is the code idiomatic for this codebase? (Not "clean" — idiomatic
   specifically for how we write things here.)
4. Is there an obviously better approach we should discuss before merge?

Nit-picks (formatting, naming preferences within our conventions) are
prefixed `nit:` and are non-blocking. Do not block a merge on nits.

## Documentation

Every package has a `README.md`. The README explains what the package
does, when to reach for it, and how to run its tests. It does not
duplicate the API reference — that comes from TypeScript types and
`api-extractor` generated docs.

Inline docs (JSDoc) go on exported functions and types. Keep them
short; a one-line summary is better than a ten-line essay.

ADRs live in `docs/adrs/` and are numbered. Once an ADR is accepted,
do not edit it — write a new ADR that supersedes it.

## Deployment

We deploy with Vercel for `apps/web` and `apps/admin`, and Fly.io for
`apps/api` and `apps/worker`. Both are orchestrated from GitHub Actions.

Pre-deployment checklist, for every production deploy:

1. CI is green on main.
2. Migration plan reviewed (if any migrations in the diff).
3. Feature flags configured in LaunchDarkly before the deploy, not
   after.
4. Oncall is aware. If the deploy is non-trivial, oncall is +1 in the
   deploy channel before the button is pressed.

## Incident response

When something breaks in production:

1. Declare an incident in #inc with a short description. Bots spin up a
   Zoom and a dedicated channel.
2. Identify the commander. The commander coordinates; they do not
   necessarily debug.
3. Mitigate first, understand second. Reverting a deploy is cheap; a
   prolonged outage is expensive.
4. Write a post-incident review within one working day. The PIR goes in
   `docs/incidents/`; it is blameless.

## Common pitfalls

- The Fastify plugin system has loading order semantics you probably
  do not want to re-derive. Use `app.register` through our
  `packages/fastify-plugins` wrapper.
- TanStack Query `staleTime: 0` means "refetch on every render," which
  is almost never what you want. Default is 5 minutes.
- `process.env.NODE_ENV` is `production` in preview deploys too. Do
  not gate behaviour on it for "only run in prod" logic; use
  `DEPLOY_STAGE` instead.
- Prisma's `findFirst` is not indexed unless the filter is on an
  indexed column. Use `findUnique` when you have one.

## Agent routing — when to reach for which skill

When the user asks you to run tests, use the `run-tests` skill.
When the user asks you to deploy, use the `deploy` skill.
When the user asks you to review a PR, use the `review-pr` skill.
When the user asks for a refactor, use the `refactor-suggest` skill.
When the user asks you to plan a feature, use the `feature-plan` skill.
When the user reports a bug, use the `bug-reproduce` skill before
attempting a fix.

If the user's question is genuinely ambiguous, ask rather than guess.

## Historical notes

The monorepo was created in 2022 out of what was then three separate
repos (acme-web, acme-api, acme-design-system). The migration took one
quarter and the PR history up to that point lives in the `legacy/`
branch tag for anyone who needs to archaeologise.

We briefly evaluated Nx before settling on Turborepo. Nx's project
graph is more powerful; Turborepo's config is simpler and that mattered
more. ADR-0009 covers the decision.

## Contact

Platform engineering is on Slack at #platform. The rotating lead is
listed at the top of the channel. For architectural questions that are
not time-sensitive, open a discussion in the `architecture` repo.

## Advanced TypeScript patterns

### Result types

Every function that can fail at a package boundary returns a `Result`:

```ts
export type Result<T, E = Error> =
  | { status: 'ok'; value: T }
  | { status: 'err'; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ status: 'ok', value });
export const err = <E>(error: E): Result<never, E> => ({ status: 'err', error });
```

Callers branch on `status`, which gives the compiler enough information
to narrow. We considered `neverthrow` and `fp-ts` and rejected both —
too much ceremony for the value delivered. The hand-rolled `Result`
above does 95% of what we need in 10 lines.

### Branded types

When two values share a primitive representation but different
semantics (user id vs. tenant id, both strings), we brand them:

```ts
export type Brand<T, B extends string> = T & { readonly __brand: B };
export type UserId = Brand<string, 'UserId'>;
export type TenantId = Brand<string, 'TenantId'>;
```

Constructors live next to the type and do the validation:

```ts
export function userIdFrom(raw: string): Result<UserId, 'invalid-user-id'> {
  if (!raw.startsWith('usr_')) return err('invalid-user-id');
  return ok(raw as UserId);
}
```

### Exhaustive switch with `never`

For unions, use the `never` trick to force exhaustive switches:

```ts
function unreachable(x: never): never {
  throw new Error(`unexpected value: ${JSON.stringify(x)}`);
}

function handle(event: DomainEvent): void {
  switch (event.type) {
    case 'invoice.paid':   return handlePaid(event);
    case 'invoice.failed': return handleFailed(event);
    default:               return unreachable(event);
  }
}
```

The compiler will refuse to compile the `unreachable` call if a new
variant is added to `DomainEvent` and no case handles it.

## React cookbook

### When to `'use client'`

`'use client'` is a boundary between server-rendered and
client-rendered regions, not an opt-out of server rendering. Mark a
component client if it needs: state, effects, event handlers, browser
APIs, or a client-only library.

Start Server, go Client only when necessary. Most pages should have a
small island of client components inside a server-rendered shell.

### When to colocate a loader

Colocate data loading with the component when the data is only used by
that component. Hoist to a parent when two siblings need the same data
— don't let both fetch independently.

### Forms

We use `react-hook-form` with Zod resolvers. The schema is shared
between client validation and server-side validation: parse the same
Zod schema on both sides. No duplicated validation logic.

### Suspense boundaries

Put a `Suspense` boundary at every data-loading subtree. The boundary
is what lets React start streaming that part of the tree independently.
A single giant Suspense at the root means you block on the slowest
query.

### Error boundaries

Every feature has an error boundary at its root. The boundary renders a
human-readable fallback and reports the error to Sentry. Do not let
errors propagate to the root layout — that crashes the whole app.

## API cookbook — common patterns

### Pagination

Cursor-based, never page-based. Cursors are opaque; do not let the
client reverse-engineer them. Pothos has a connection plugin we use
for everything paginated.

```ts
builder.prismaConnection({
  type: Invoice,
  cursor: 'id',
  resolve: (query, _parent, _args, ctx) =>
    ctx.prisma.invoice.findMany({ ...query, where: { accountId: ctx.accountId } }),
});
```

### Filtering

Filter arguments are a typed input object. Avoid string filters and
search-language DSLs; they are a footgun. If the filter is getting
complicated enough that a DSL feels necessary, the right move is
usually to add a dedicated endpoint.

### Batch writes

For bulk creates, use `createMany`. For bulk updates that can't be
expressed as a single where + set, collect the updates and issue them
in a transaction.

### Optimistic concurrency

Every row we care about has a `version` column. Updates take a
`version` input and bump it; mismatches return a conflict result, not
a silent overwrite.

## Database cookbook

### Migration recipes

Renaming a column (non-breaking):

1. Add the new column, mark old nullable.
2. Deploy the backfill worker.
3. Wait for backfill to complete (monitor the lag metric).
4. Cut over readers to the new column.
5. Deploy a release that writes to the new column only.
6. Drop the old column.

Each step is a separate PR and a separate deploy. Four deploys, one
week minimum. That is the cost of a zero-downtime rename.

### Index strategy

- Add indexes to cover our actual query patterns. "What if we sort by
  X?" is not a justification.
- Composite indexes cover prefix queries: `(a, b, c)` covers queries
  on `a`, `(a, b)`, and `(a, b, c)`. Keep the most selective column
  first.
- Partial indexes for status-filtered queries: `WHERE status = 'active'`.
  Much smaller than a full index, hot cache.
- For every index, save the `EXPLAIN` plan that justified it next to
  the migration. Reviewers can confirm the index is actually used.

### Soft delete

We don't soft-delete. Hard delete, or archive to a `<table>_archive`
table. Soft-deleted rows forever haunt the schema; every query becomes
"remember to filter" and we got bitten too many times.

## Observability playbook

### Logs

Structured logs only. No string concatenation. Every log includes a
correlation id via AsyncLocalStorage.

```ts
logger.info({ event: 'invoice.paid', invoiceId, amountCents }, 'invoice paid');
```

Never log PII. Email addresses, names, and credit card numbers are PII
and are banned from logs. The redact layer in the logger catches most;
do not rely on it as the only defence.

### Metrics

Datadog. Every meaningful operation emits a metric. We prefer a small
number of dimensions and a lot of data points over a large number of
dimensions and few data points per dimension.

Do not emit per-user metric cardinality. That's what logs are for.

### Traces

Every external call is wrapped in a span. Name the span after the
operation, not the URL: `stripe.charges.create`, not
`POST /v1/charges`.

### Dashboards

Every on-call rotation has a top-level "at a glance" dashboard. If a
signal is not on that dashboard, it does not exist operationally.

## ADR index

Architecture Decision Records live in `docs/adrs/`. Short summaries:

- ADR-0001: Adopted TypeScript monorepo.
- ADR-0003: pnpm over npm/yarn. Workspace-protocol deps.
- ADR-0005: Turborepo over Nx.
- ADR-0009: Turborepo over Nx, revisited with more context.
- ADR-0011: Next 15 app router adoption.
- ADR-0013: Clerk for auth; no home-rolled session.
- ADR-0017: Commit the generated Prisma client.
- ADR-0023: Fastify + GraphQL Yoga + Pothos.
- ADR-0027: BullMQ for job queues.
- ADR-0033: Invoice webhook ordering by event id.
- ADR-0041: Billing hot-path gets extra review.
- ADR-0045: Testcontainers in integration tests; no Prisma mocks.
- ADR-0051: Full jitter over decorrelated jitter.
- ADR-0058: No soft-delete.

## Glossary

- **Account**: the tenant entity. A user belongs to one or more accounts.
- **Subject**: the canonical invoice/charge holder. Usually the
  account, occasionally a user (for self-serve signups).
- **Event**: a domain event published to the outbox. Consumed by the
  worker.
- **Outbox**: a dedicated table that buffers events for reliable
  at-least-once publication to external systems.
- **PCI flag**: a boolean on the account that indicates whether PCI
  scope applies to the account's data. Changes gate fields in the UI.

## FAQ

### Why is the generated Prisma client committed?

See ADR-0017. Short version: the generation step was flaky enough in
CI that committing it shaved minutes off every build and eliminated a
class of mysterious failures.

### Why don't we use `prisma.$transaction` more often?

We do use it — for multi-write operations. What we don't do is wrap
every individual write in a transaction; that's a performance hit for
no added correctness.

### Why GraphQL, not tRPC?

Historical. The API was built when GraphQL was the better-tooled
option for our shape. We have evaluated migrating twice; both times
the answer has been "the delta is not worth the migration cost."

### Why Clerk, not Auth.js / NextAuth / Supabase auth?

Clerk's session model and RBAC primitives fit our needs without custom
work. We evaluated alternatives during ADR-0013; Clerk won on
developer experience and by having the integration features we needed
out of the box (organisation support, SSO, session revocation).

### Why is this CLAUDE.md so long?

It accreted. We're aware. There is an open ADR to split much of this
into `.claude/rules/` files, but it has not landed.

## Legacy code guide

### The `legacy/` branch tag

The branch tag `legacy/pre-monorepo` preserves the pre-2022 state of
what used to be three separate repos. Do not merge this tag into main
ever. It exists so we can `git blame` things that predate the
monorepo.

### `packages/legacy-shim`

A small package that preserves the surface of what used to be the
`@acme/utils` package from the pre-monorepo days. Every function in it
is a re-export with a deprecation comment pointing at the new home.
When the shim is empty, delete the package.

### Python analytics pipeline (retired)

The analytics pipeline ran on Python until Q3 2024. The code is in
the `analytics/` directory on the `legacy/pre-migration` branch. Do
not try to run it against current data shapes; the schemas have
diverged.

## What belongs in CLAUDE.md vs. `.claude/rules/`

CLAUDE.md holds:

- Facts about this project that apply everywhere (stack, layout,
  always-on conventions).
- Routing information (when to reach for which skill).
- Incident playbooks (because they need to be in context during the
  incident, not loaded on demand).

`.claude/rules/` holds:

- Path-scoped instructions (only load when working with matching files).
- Team conventions that change frequently and don't need to be
  beaten into every session.

In doubt, put it in a rule file and move it up to CLAUDE.md if we keep
needing it everywhere.

## Post-incident template

Every incident gets a PIR (post-incident review) within one working
day. The template is in `docs/incidents/template.md`. Sections:

1. Summary (what happened, who was affected, blast radius).
2. Timeline (each event, with timestamps).
3. Root cause (not "root causes" — pick one; everything else is a
   contributing factor).
4. What worked (monitoring caught it, escalation path was clean,
   rollback was fast).
5. What didn't (delayed detection, ambiguous ownership, noisy
   dashboard).
6. Action items (with owners and due dates).

Write PIRs blamelessly. The template prompts you to do so; if a draft
reads as blame, send it back.

## Support rotations

Support rotation is weekly. The current rotator is pinned in #support.
The support rotator is responsible for triaging incoming customer
issues, responding to #support Slack threads within one hour during
business hours, and escalating genuine incidents into #inc.

The support rotator does not commit to delivery on feature work during
their rotation; they are a full-time triager for the week.

## Weekly and monthly rituals

- Monday: team standup at 10:00 PT. 15 minutes. Blocked-on-what and
  what's-landing.
- Tuesday: architecture office hours. Drop in with design questions.
- Wednesday: no meetings. Focus time.
- Thursday: retro and planning alternating weeks.
- Monthly: incident review. Trend-level reflection on what incidents
  taught us.

## When not to ping a human

Claude can do more than we give it credit for. Do not ping a human when:

- You need to lint a file.
- You want a one-liner explained.
- You're curious about how something works in the monorepo.
- You need to confirm a convention that is in this file.

Do ping a human when:

- The answer isn't in the docs and you've spent 15+ minutes looking.
- The change touches the billing hot path.
- You're considering a change that has architectural implications.
- The change is security-sensitive.

## Appendix: common commands cheatsheet

```
pnpm install                                # install everything
pnpm i --frozen-lockfile                    # CI-equivalent install
pnpm build                                  # build all packages
pnpm test                                   # run unit tests
pnpm --filter @acme/api test                # run unit tests for one package
pnpm --filter @acme/api test:integration    # run integration tests
pnpm lint                                   # run eslint + prettier check
pnpm typecheck                              # run tsc --noEmit across the graph
pnpm --filter @acme/db migrate:dev          # create a new migration
pnpm --filter @acme/db generate             # regenerate Prisma client
pnpm --filter @acme/web dev                 # start the web dev server
pnpm --filter @acme/api dev                 # start the api dev server
pnpm --filter @acme/worker dev              # start the worker
pnpm bench                                  # run benchmarks
pnpm dx:reset                               # nuke caches and reinstall
```
