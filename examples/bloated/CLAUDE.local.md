# Personal notes

Local dev DB runs on port 5433 (5432 is occupied by another project).
Export `DATABASE_URL=postgres://localhost:5433/acme_dev`.

I use `pnpm` via corepack; the team uses `pnpm` installed globally —
same thing, different path. Both work with the lockfile.

My Clerk dev instance is separate from the team's staging instance; my
keys are in Doppler under the `say-personal` profile.
