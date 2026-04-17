---
name: bug-reproduce
description: Reproduce a reported bug before attempting a fix. Use when the user reports a bug, describes unexpected behaviour, or asks "why is X happening".
---

Before writing a fix, write a failing test that demonstrates the bug.
Only then attempt the fix. If you cannot reproduce the bug in a test,
stop and ask the user for more specifics.
