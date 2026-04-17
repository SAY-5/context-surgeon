# API conventions

## Response envelope

Every response body is an object with `data` and `error` keys. Exactly one
is non-null.

- Success: `{ "data": <payload>, "error": null }`.
- Failure: `{ "data": null, "error": { "code": "...", "message": "...", "details": [...] } }`.

## Error codes

Error codes are stable strings in `snake_case`. See @details.md for the
full error code inventory and the situations that produce each one.

## Idempotency

Write endpoints accept an `Idempotency-Key` header. If two requests with
the same key and the same body arrive within 24 hours, the second one
returns the first response without re-running the handler.
