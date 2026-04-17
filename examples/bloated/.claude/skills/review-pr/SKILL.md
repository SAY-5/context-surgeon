---
name: review-pr
description: Review an Acme pull request against our conventions. Use when the user asks to review a PR, check their own diff before requesting review, or evaluate someone else's PR.
---

Fetch the PR with `gh pr view <n> --json`. Read the diff. Check against
the reviewer rubric in CLAUDE.md (does the PR do what it says, tests,
idioms, better approaches). Comment with `nit:` prefix on non-blocking
items.
