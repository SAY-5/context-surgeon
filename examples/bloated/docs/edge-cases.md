# Edge cases

## Partial writes

A write that updates N tables can partially succeed if the process dies
between writes. Every such write is wrapped in a Prisma transaction.
If you find a place doing multiple writes without a transaction, open
an issue — it is a latent bug.

## Retry-unsafe operations

Some operations are not safe to retry: Stripe charge creation without
an idempotency key, outbound webhook delivery without deduplication,
email send. For these, the pattern is to persist the intent first and
mark it complete only after the external call returns success.

## Clock skew

Servers can disagree about the current time by seconds. We never
compare timestamps across servers as a correctness check; we use
monotonic sequence numbers (PG sequences) for ordering.

## Partition tolerance

The API and the worker share a database. The worker's durability
assumption is that its queue is consistent with the database state at
enqueue time. That is enforced by enqueueing inside the same
transaction that makes the state change.
