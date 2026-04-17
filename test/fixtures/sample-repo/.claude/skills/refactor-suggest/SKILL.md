---
name: refactor-suggest
description: Suggest refactors for a target file or function. Use when the user says "refactor this", "clean this up", "simplify", "extract", or points at a function and asks how it could be improved. Good for functions over 30 lines, for classes that seem to be doing more than one thing, for duplicated blocks, for conditionals that could be data tables, for nested callbacks that could be awaits, or for any code that smells of being copied from another codebase without being adapted to the conventions in this one. Covers extract-function, extract-method, extract-class, inline, replace-conditional-with-polymorphism, replace-nested-conditional-with-guard-clauses, introduce-parameter-object, preserve-whole-object, remove-middle-man, hide-delegate, and a handful of others from the standard refactoring catalogue. Also covers test-aware refactors where the refactor is only safe if the tests cover the behaviour, and it will refuse to suggest the refactor if the test coverage is clearly inadequate. It will also refuse to suggest a refactor it cannot explain in one paragraph — the burden is on the skill to justify the churn, not on the reviewer to decide whether the churn was worth it.
when_to_use: User asks to refactor a file, function, class, or module. Also triggers when the user asks about code smells, technical debt, or "how could this be cleaner." Do not trigger for net-new feature requests; those belong in a different skill. Do not trigger during a bug fix unless the user explicitly asks for cleanup alongside the fix — fixes should stay minimal.
---

Read the target file. Propose up to three refactors, each with:
1. The refactor name (from the catalogue above).
2. A one-paragraph justification.
3. The concrete edit as a unified diff.

Stop after three suggestions even if more are possible.
