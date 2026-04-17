# Deploy

Vercel for web apps, Fly.io for API and worker. Orchestrated from
GitHub Actions.

Pre-deploy checklist: CI green, migrations reviewed, feature flags
configured, oncall aware. Production deploys are always manual via
the "promote to production" workflow.

Never deploy on Friday after 4pm, unless the deploy is a rollback.
