# Code style (verbose redundant version)

Use 2-space indentation in all files. Prettier enforces this on save and
on pre-commit; you should not need to think about it, but if your editor
is doing something weird, check that `.editorconfig` is being picked up
and that the project's Prettier config is active.

Single quotes for strings, with the usual exception: switch to double
quotes if the string contains an unescaped single quote. Backticks only
for template literals. Never `"string concatenation with " + variable` —
use a template literal.

Trailing commas on multi-line literals. Semicolons at the end of every
statement. No wrapping if/else bodies in a single-line brace style;
always use braces even for one-line blocks.

Line length is capped at 100 columns. Prettier rewraps for you; if a
line is still over 100 after formatting, the problem is structural.
Refactor — probably extracting a variable or splitting a call.

Imports are grouped: node built-ins, external packages, workspace
packages, relative. One blank line between groups. Import sort ESLint
rule enforces this.
