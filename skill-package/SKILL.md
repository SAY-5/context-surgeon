---
name: context-surgeon
description: Audit what Claude Code loads into context before the user types — total always-on tokens, per-source breakdown, and findings across four categories (clipped skill descriptions, rules that never apply, duplicates, possible conflicts). Use when the user asks about CLAUDE.md size, token budget, agent config bloat, whether a skill is being truncated, why a rule seems to be ignored, or what's eating their context window.
when_to_use: Trigger on phrases like "audit my context", "what's in my CLAUDE.md", "why is this session so expensive", "are my skills clipped", "what rules am I loading", "check for context bloat", or "how do I trim my agent config". Also trigger when the user reports Claude ignoring a specific rule, or when context-window pressure is blocking a long session.
allowed-tools: Bash Read
---

# context-surgeon — Claude Code skill

When this skill activates, do the following:

## 1. Run the audit

Run `npx context-surgeon audit --json` in the current working directory. If the user has set `ANTHROPIC_API_KEY`, the CLI auto-upgrades to exact token counts and real conflict classification; you don't need to pass anything special.

If `npx context-surgeon` is not available, tell the user: "This skill requires `context-surgeon`. Install with `npm install -g context-surgeon`, then re-run."

## 2. Parse the JSON report

The CLI writes a single JSON object to stdout with these top-level fields:

- `cwd`, `total`, `contextWindow`, `mode` (`"estimate"` or `"exact"`)
- `sources`: array of `{ path, kind, scope, bucket, tokens, label }`
- `findings`: array of objects with `kind`, `severity`, `estimatedTokensReclaimed`, plus finding-specific fields

Group findings by `kind`:

- `clipped` — skill metadata past the 1,536-char menu limit
- `path-mismatch` — rule's `paths:` frontmatter matches no files in the repo
- `language-mismatch` — rule references a language the repo doesn't use
- `duplicate` — paragraph-level near-identical text across two files
- `possible-conflict` — topically-similar paragraphs (offline mode only)
- `conflict` — Claude Haiku verdict that two paragraphs contradict (exact mode)

## 3. Summarize in your own voice

Lead with the headline numbers:

> Your always-on context is **N tokens** before you type. I found **X warnings** and **Y notes** — **~Z tokens reclaimable** if you act on the warnings.

Then, per finding: name the file by short path, describe the issue in one sentence, and propose a concrete edit. Not "fix it" — "delete lines 15–22 of `.claude/rules/python-legacy.md`, or delete the file if this repo will never have Python."

For `duplicate` findings: show both paths + line numbers. Recommend keeping one copy.

## 4. Notes about possible-conflicts

If the report contains any `possible-conflict` findings and the mode is `"estimate"`, mention once per session (not per finding): "Offline mode can only flag candidate pairs on similar topics. Set `ANTHROPIC_API_KEY` and re-run for Claude Haiku to classify real contradictions vs. just-related paragraphs."

## 5. Do not auto-edit

Propose edits as unified diffs or specific "delete line X" instructions. Ask before modifying files. If the user says "go ahead" or "apply them," then proceed — but one file at a time, confirming after each.

## 6. Exact-mode re-run

If the user says "run in exact mode" or similar, check `process.env.ANTHROPIC_API_KEY`. If set, re-run `npx context-surgeon audit --json`; the CLI picks up the key automatically. If not set, ask the user to export it first.
