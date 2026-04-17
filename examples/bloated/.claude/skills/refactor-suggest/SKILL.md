---
name: refactor-suggest
description: >-
  Suggest refactors for a target file, function, class, or module in
  the Acme monorepo. Use when the user says "refactor this", "clean
  this up", "simplify", "extract", "this is getting messy", "this
  function is too long", or points at code and asks how it could be
  improved. Good for functions over 30 lines, classes doing more than
  one thing, duplicated blocks across sibling files, conditionals that
  could be replaced by lookup tables, nested callbacks that could be
  awaits, deeply nested ternaries, unclear variable names, modules
  that import too many other modules, files over 400 lines, test
  files that have accreted setup across too many nested describes,
  and any code that reads as though it was ported from another
  codebase without being adapted to the Acme conventions in CLAUDE.md.
  Covers the classic Fowler refactoring catalogue — extract-function,
  extract-method, extract-class, extract-interface, inline-function,
  inline-temp, replace-conditional-with-polymorphism,
  replace-nested-conditional-with-guard-clauses,
  introduce-parameter-object, preserve-whole-object, remove-middle-man,
  hide-delegate, move-field, pull-up-method, push-down-method,
  replace-magic-literal-with-constant,
  replace-type-code-with-subclasses, replace-subclass-with-fields,
  collapse-hierarchy, decompose-conditional,
  consolidate-duplicate-conditional-fragments, and a handful of others
  that come up in practice. Also covers test-aware refactors where
  the refactor is only safe if the tests cover the behaviour; the
  skill should refuse to suggest a refactor it cannot explain in one
  paragraph of why-this-change-is-worth-it.
when_to_use: >-
  User asks to refactor a file, function, class, module, or package.
  Also triggers when the user asks about code smells, technical debt,
  what would you clean up here, how could this be simpler, this feels
  wrong, or describes behaviour that has grown into bugs that live in
  the shape of the code. Do not trigger for net-new feature requests;
  those belong in feature-plan. Do not trigger during a bug fix unless
  the user explicitly asks for cleanup alongside the fix — fixes stay
  minimal.
---

Read the target file or symbol. Propose up to three refactors, each with:

1. The refactor name from the catalogue above.
2. A one-paragraph justification in plain English — "this function mixes X and Y responsibilities, and they change for different reasons, so splitting them will reduce coupling with the billing module."
3. A concrete edit as a unified diff, following the Acme style guide in CLAUDE.md.
4. A list of tests that cover the behaviour being refactored. If no tests exist, stop and say so; do not attempt the refactor.

Stop after three suggestions even if more are possible. Users can ask for more. The point of the cap is to force prioritisation.
