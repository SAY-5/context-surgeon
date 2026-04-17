---
name: deploy
description: Promote the current main branch to production via the GitHub Actions "promote to production" workflow.
disable-model-invocation: true
---

Never invoke automatically. User must type `/deploy` explicitly.

Verify the pre-deployment checklist in CLAUDE.md is satisfied, then
trigger the `promote-to-production` workflow via `gh workflow run`.
