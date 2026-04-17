# context-surgeon — Claude Code skill

This directory is a drop-in Claude Code skill. Install it once, and Claude Code can audit your agent context on request — reporting always-on token counts, clipped skill descriptions, rules that never apply, duplicate paragraphs, and possible conflicts across your configuration.

## Install

Copy the skill into your user-level Claude Code skills directory:

```bash
cp -r skill-package ~/.claude/skills/context-surgeon
```

Or symlink it if you're developing against this repo:

```bash
ln -s "$(pwd)/skill-package" ~/.claude/skills/context-surgeon
```

Claude Code picks up new skills within the running session — no restart required.

## Requirements

- `context-surgeon` CLI must be runnable via `npx` or installed globally. The skill subprocesses out to the CLI; it does not duplicate any analyzer logic in prompt form.
- Optional: `ANTHROPIC_API_KEY` exported in the environment before launching Claude Code — the skill will pick up exact-mode token counts and automated conflict classification without any extra configuration.

## Usage

Once installed, ask Claude Code naturally:

- "Audit my context."
- "What's in my CLAUDE.md?"
- "Why is this session so expensive?"
- "Are any of my skills being clipped?"

Claude Code will invoke the skill, run `npx context-surgeon audit --json` in your repo root, parse the report, and summarize the findings in chat.

## What the response looks like

A typical summary:

```
Your always-on context is 16K tokens before you type. I found 5 warnings
and 4 notes — ~660 tokens reclaimable if you act on the warnings.

Warnings:
  • .claude/skills/refactor-suggest/SKILL.md — description is 555 chars
    past the 1,536-char menu cap. Trim the Fowler catalogue to a short
    list or move it into the body (~120 tokens reclaimable).
  • .claude/rules/python-legacy.md — matches no Python files in this
    TypeScript repo. Delete the file (~120 tokens reclaimable).
  • … (three more)

Notes:
  • CLAUDE.md:253 ↔ .claude/rules/security.md:16 — the same paragraph
    appears verbatim in both. Keep one copy.
  • CLAUDE.md:42 ↔ .claude/rules/typescript.md:4 — similar topic
    (TypeScript strict config). Review manually, or set
    ANTHROPIC_API_KEY to get Claude Haiku's verdict.
```

## How it works

The skill is a thin prompt wrapper. At activation, it runs `npx context-surgeon audit --json`, parses the structured report, and asks Claude Code to present findings in plain English with specific edit suggestions. The CLI is the source of truth; the skill never reimplements analysis.

## License

MIT, same as the parent project.
