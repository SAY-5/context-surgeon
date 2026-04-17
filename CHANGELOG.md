# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - Unreleased

### Added

- Terminal, SVG, and PNG rendering of the agent context surface — one horizontal bar segmented by source (system prompt, project CLAUDE.md, rules, auto-memory, skills, imports) with a hatched "room for your prompt" sliver on the right.
- Four analyzers: clipped skill descriptions (deterministic at the 1,536-char menu limit), path/language mismatches (rule paths that match no files, or keywords for absent languages), duplicates (TF-IDF cosine over character 3–5-grams, threshold 0.85), and possible-conflicts (offline candidates) / conflicts (exact-mode verdicts via Claude Haiku).
- Offline tokenizer default via the bundled Anthropic tokenizer; exact mode via `ANTHROPIC_API_KEY` using the Anthropic `count_tokens` API. Mode badge (`[±est]` or `[exact]`) propagates to every renderer.
- `audit` (default), `tokens`, and `version` subcommands.
- `--json`, `--svg [path]`, `--png <path>`, `--out <dir>` output formats; all mutually exclusive and validated.
- `--include-home`, `--force-offline`, and `--width` flags.
- Claude Code skill package at `skill-package/SKILL.md` that subprocesses out to the CLI and surfaces findings in chat.
- Inter and JetBrains Mono TTFs bundled under `assets/fonts/` so PNG output is pixel-identical across systems without the fonts installed.
- Hero demo fixture at `examples/bloated/` — a realistic 593-line TypeScript-monorepo `CLAUDE.md` with overlapping rules, clip-bait skills, path-mismatch rules, and a seeded duplicate.

[0.1.0]: https://github.com/SAY-5/context-surgeon/releases/tag/v0.1.0
