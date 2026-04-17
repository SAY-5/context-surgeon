# Conventions

## Error model

Every function that can fail returns a `Result<T, E>` where the error
type is a discriminated union. We do not throw across package
boundaries for expected failure modes; we throw only for unexpected
invariant violations.

```ts
type Result<T, E> =
  | { status: 'ok'; value: T }
  | { status: 'err'; error: E };
```

## Async boundaries

At every async boundary (HTTP, queue, cron) we wrap the handler in a
correlation-id scope. Logs inside the handler carry the correlation id
automatically via AsyncLocalStorage.

## Config

Config reads from environment variables through a single Zod schema per
process. The schema lives in `src/config.ts` within each app. Missing
or malformed config causes the process to exit at startup with a
descriptive error; no "default to something reasonable" fallbacks.

For the weirder patterns that emerge when these conventions meet
integrations, see @patterns.md.
