# Error codes

| code                     | http | when                                              |
| :----------------------- | :--- | :------------------------------------------------ |
| `validation_failed`      | 422  | Request body failed Pydantic validation.          |
| `not_found`              | 404  | Resource does not exist or caller cannot see it.  |
| `conflict`               | 409  | Uniqueness or optimistic-lock violation.          |
| `rate_limited`           | 429  | Caller exceeded per-token rate limit.             |
| `internal_error`         | 500  | Unhandled exception. Logged with correlation ID.  |

For edge cases around rate limiting and idempotency, see @deeper.md.
