# Architecture

## Monorepo boundaries

The monorepo is divided into `apps/` (things that run) and `packages/`
(things that are imported). Apps depend on packages; packages depend on
other packages; packages do not depend on apps.

`packages/core` holds business logic that is shared between the web app
and the API. It is intentionally the widest package in the dependency
graph. Putting logic here rather than in an app is the default; pull it
into an app only if the logic is genuinely app-specific (routing, UI
composition, app-specific pipelines).

## Data flow

Writes arrive at `apps/api` through GraphQL mutations. Mutations
validate with Zod, run business logic from `packages/core`, and commit
through `packages/db` (Prisma). Async work is handed to `apps/worker`
via BullMQ queues.

Reads follow the same path in reverse. `apps/web` issues GraphQL queries
through the generated client in `packages/api-client`, which hits
`apps/api`, which reads through `packages/db`.

## Integrations boundary

All third-party services are wrapped in `packages/integrations/`. Every
wrapper exposes a typed interface and is mockable. Business logic
imports the typed interface, not the vendor SDK directly. This makes
replacement tolerable (we replaced Rudderstack with Segment this way
over two weeks; no business logic moved).

For edge-case conventions that come up while wiring integrations, see
@conventions.md.
