---
name: run-tests
description: Run the test suite for the Acme monorepo. Use when the user asks to run tests, confirm a change is green, or check for regressions.
---

Run `pnpm test` from the repo root. If the user named a package, scope to
it with `pnpm --filter @acme/<pkg> test`. If any test fails, show the
first failing test's output and stop.
