---
paths:
  - "**/*.py"
  - "requirements.txt"
  - "pyproject.toml"
---

# Python (legacy, pre-migration)

This rule file was added when the analytics pipeline still ran on Python.
The pipeline was migrated to TypeScript workers in Q3 2024, but nobody
cleaned this rule up.

- Use Black for formatting, Ruff for linting.
- Pin versions in `requirements.txt`, no ranges.
- Type hints on every function.
- Prefer dataclasses over plain dicts for structured return values.
- Use `logging`, not `print`, in any non-CLI module.
