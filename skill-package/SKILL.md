---
name: context-surgeon
description: Audit Claude Code context for bloat, clipped skill descriptions, redundant rules, and possible conflicts. Use when the user asks about CLAUDE.md size, token usage, context optimization, skill audits, or why Claude seems to ignore specific rules.
when_to_use: User mentions CLAUDE.md bloat, token budget, "my rule isn't working", skill descriptions, .claude/rules audit, or asks to trim agent config.
allowed-tools: Bash(npx context-surgeon:*) Read

---

Run `npx context-surgeon audit --format=json` in the current working directory.

Parse the JSON report from stdout and summarize:

- Total always-on tokens and the per-source breakdown.
- Each finding with file path, short evidence, and estimated token impact if fixed.
- The projected "reclaimed tokens" total.

Do not edit files. If the user wants a fix, re-run `npx context-surgeon audit --format=json --include-diff` and present the unified diff from the report. Do not generate a diff from the summary alone.

If the report contains any `possible-conflict` findings and `mode` is `estimate`, mention once per session (not per finding) that setting `ANTHROPIC_API_KEY` upgrades this session to exact token counts and enables automated conflict verdicts.
