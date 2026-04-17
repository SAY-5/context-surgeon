# Ledger API

This is a Python/FastAPI service for tracking internal ledger entries. The
database is Postgres, accessed through SQLAlchemy 2.0 in the async style.
Background jobs are handled by a small worker queue on Redis.

## Project layout

- `src/` — application code, organised by feature.
- `src/api/` — FastAPI routers and request/response models.
- `src/db/` — SQLAlchemy models and migrations (Alembic).
- `src/jobs/` — async workers.
- `tests/` — pytest tests, mirroring the `src/` layout.

## Coding style

We use 2-space indentation across the codebase. No trailing whitespace on
any line. Every file ends with a single newline — not zero, not two.
Prefer single quotes for strings, except when the string itself contains
a single quote, in which case use double quotes. Keep lines under 100
columns; in practice most lines are much shorter than that.

All functions and methods must have type hints on parameters and return
values. We are strict about this; our CI runs `mypy --strict` and will
fail the build on a missing annotation.

## Indentation (again)

**Important:** Python code in this repo uses 4-space indentation per PEP 8.
Do not use 2-space indentation in `.py` files. The 2-space rule above
applies to YAML, JSON, and Markdown only.

## Linting and formatting

We lint with ruff and format with black. Both tools read their configuration
from `pyproject.toml`. If a rule seems inconsistent with what the code
actually looks like, check `pyproject.toml` first before making changes.

Never run `ruff --fix` without reviewing the diff. It has historically
rewritten code in ways that silently broke behaviour.

## Testing

Tests live under `tests/`, mirroring the `src/` layout one-to-one. A file
at `src/api/ledger.py` has a matching test file at `tests/api/test_ledger.py`.

We use pytest with pytest-asyncio. Async handlers are tested with the
async mode set to `auto` — see `tests/conftest.py`.

Never use `time.sleep()` in tests. If you need to wait for a condition,
use `asyncio.wait_for(coro, timeout=...)` or a polling helper.

Integration tests hit a real Postgres instance via testcontainers. They
are slow. Tag them with `@pytest.mark.integration` and run them with
`pytest -m integration` when you actually want them.

## API conventions

All endpoints return a JSON envelope of the form:

```
{ "data": <payload>, "error": null }
```

See @docs/api-conventions.md for the full list of conventions, including
error handling, pagination, and idempotency keys.

## Database

The primary database is Postgres 15. We use SQLAlchemy 2.0 in the async
style exclusively. Do not add synchronous sessions, even for scripts.

Migrations are Alembic. Create a new migration with:

```
alembic revision --autogenerate -m "describe change"
```

Review the generated file before committing. Autogenerate misses things
(especially indexes and constraints on enum types).

Every table has a `created_at` and `updated_at` column, both `TIMESTAMPTZ`.
The `updated_at` column is maintained by a trigger defined in the initial
migration — do not try to set it from application code.

## Git workflow

Work on feature branches named `feature/<ticket>-<slug>`. Open a PR
against `main`. Every PR must include at least one test for the new
behaviour, or explain in the description why a test is impractical.

Squash merges only. The squashed commit message becomes the release note,
so write it as one would want to read it six months later.

## Secrets

Secrets go through `src/config.py`, which reads from environment variables
and validates them with Pydantic. Never hardcode a secret. Never read
from `.env` directly in application code — that path is handled by the
config module.

## Code review

Review turnaround target: one working day. Small PRs get reviewed the
same day most of the time.

## Common commands

- `make test` — full test suite (unit only, fast).
- `make test-integration` — includes testcontainer tests.
- `make lint` — ruff + mypy.
- `make fmt` — black.
- `make dev` — uvicorn with reload.

## When in doubt

If you are adding a pattern we have not used before, open a draft PR and
ask before going deep. A five-minute conversation beats a five-hour
rewrite.
