# Memory Index

Small auto-memory fixture for discovery tests.

- prefers ripgrep over grep; always use `rg` in shell examples.
- test DB password lives in 1Password; never hardcode it in fixtures.
- integration tests use testcontainers; do not mock Prisma.
