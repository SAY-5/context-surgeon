# Contributing

Quick start:

```bash
npm install
npm run build
npm test
```

## Rules

- **Issue first for non-trivial work.** Anything over ~50 lines changed, or anything that touches the analyzer, renderer, or public CLI surface — open an issue before opening the PR so we can agree on the shape before you spend time.
- **Tests where they matter.** Analyzers, parsers, and the tokenizer all have tests; if you touch behavior there, add coverage. Pure visual tweaks to the renderers don't need new tests, but existing snapshots should stay passing.
- **No silent fallbacks.** If a code path can fail in a way a user should know about, throw loudly with context (file path, model name, HTTP status).
- **Small PRs.** One logical change per PR. Reviewable in under ten minutes.

## Style

2-space indentation, single quotes, trailing commas, LF line endings. Prettier-compatible but we don't ship a Prettier config — the TypeScript compiler is strict enough that style mostly settles itself.

TypeScript is `strict: true` with `noUncheckedIndexedAccess`. Fix the types; don't weaken the config.

## Before you open a PR

- `npm run build` is clean (no TS errors).
- `npm test` passes.
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `refactor:`, etc.).
- PR description states what changed and why. A diff without a "why" is hard to review.

## Reporting bugs

Use the bug-report template in `.github/ISSUE_TEMPLATE/`. Paste the output of `npx context-surgeon version` — that's what the template asks for, and it covers most of what a triager needs.

## Review turnaround

I read every issue and PR; response time varies based on what else is on fire.

## Code of conduct

This project follows the [Contributor Covenant 2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you agree to uphold this code.
