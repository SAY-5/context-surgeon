# Testing

Vitest for unit, Vitest + Testcontainers for integration, Playwright for
E2E. Tests live next to the code they cover.

Integration tests boot a real Postgres. Do not mock Prisma. If the test
"feels slow", that is fine — it is doing real work, which is why it
catches real bugs.

Never `setTimeout` in a test. Await the thing you are waiting for, or
use `vi.waitFor`.

Snapshot tests only for deterministic compiler output. Not for UI, not
for API responses, not for anything that changes.

Regression tests: every bug fix ships with a test that would fail
without the fix. Enforce in code review.
