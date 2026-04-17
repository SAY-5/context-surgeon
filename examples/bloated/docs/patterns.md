# Patterns

## Idempotency

Write endpoints accept an `Idempotency-Key` header. The pattern is:

1. Hash the key + the canonical request body.
2. Check Redis for a stored response under that hash.
3. If present, return the stored response.
4. If absent, run the handler, store the response, return it.

Responses are stored for 24 hours. The key is not inspected; any
opaque string works.

## Retries

Retries on outbound calls use exponential backoff with full jitter,
capped at 30s. We tried decorrelated jitter for a quarter; the
observable behaviour was worse for our workload. Full jitter it is.

For the weirder situations — what happens when an idempotent write
partially succeeds, what retries look like across async queue
boundaries, and the handful of cases where retrying is actively
harmful — see @edge-cases.md.
