# Edge cases

Rate limiting is per-token, not per-IP. A caller with ten tokens effectively
has ten separate rate limit buckets. This is intentional — it lets
background jobs and interactive traffic coexist without one starving the other.

Idempotency keys are stored for 24 hours. After that, the key is free to be
reused. In practice no one reuses keys.
