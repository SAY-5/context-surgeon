---
name: feature-plan
description: >-
  Produce an implementation plan for a new feature in the Acme monorepo.
  Use when the user describes a feature they want to build, asks "how
  would we build X", asks for an implementation plan, asks for a
  breakdown of work, asks for a technical design doc, asks which
  packages a change would touch, or asks whether something is possible
  within the current architecture. The plan should cover — which
  packages are affected (apps/web, apps/api, apps/worker, packages/ui,
  packages/db, packages/core, packages/auth, packages/integrations),
  what new routes or mutations are needed, what database changes are
  needed (new tables, new columns, indexes, migrations), what Prisma
  model changes and their migration path, what new UI components are
  needed in packages/ui or composed at the app level, what state
  management changes are needed (Zustand stores, TanStack Query keys
  and invalidation), what integrations need to be touched (Stripe,
  Segment, Resend, Intercom, Snowflake, Clerk), what feature flags are
  appropriate and where to wire them in LaunchDarkly, what new
  telemetry is expected and where to emit it, what testing strategy
  covers the change (unit, integration, E2E), what rollout plan makes
  sense (dark launch, gradual percentage, full release), and what
  could go wrong at each phase. The plan should also identify any
  architectural decisions that would benefit from an ADR rather than
  being buried inline, and flag any parts of the plan that touch the
  hot path for the billing flow (which gets extra review scrutiny per
  ADR-0041). The plan's format is a markdown document with sections in
  the order above; each section is a short paragraph plus a bulleted
  list of concrete tasks, each task small enough to fit into a half-day
  of work.
when_to_use: >-
  User asks for an implementation plan, asks how we would build X,
  wants a breakdown of work across packages, wants a technical design,
  or describes a feature in enough detail that the right next step is
  planning rather than coding. Do not trigger for single-file changes,
  bug fixes, or refactors — those have their own skills.
---

Produce a plan in the format described above. If the user's request is
ambiguous in ways that would change the shape of the plan, ask one or
two clarifying questions first, then plan. Do not plan around assumptions
without naming them.
