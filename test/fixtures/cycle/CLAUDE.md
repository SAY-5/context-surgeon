# Cycle fixture

This file imports @a.md, which imports @b.md, which imports @a.md again.
The resolver should fail with a clear cycle error listing all three paths.
