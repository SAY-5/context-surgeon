---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# TypeScript rules

Strict mode is on. `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, `noImplicitOverride: true`. These are not negotiable — if a file cannot satisfy these, fix the file, do not weaken the config.

Never use `any`. If you do not know the shape, use `unknown` and narrow
with a type guard.

Prefer discriminated unions over boolean flags for representing state.
`type Result = { status: 'ok', value: T } | { status: 'err', error: E }`
beats `{ ok: boolean, value?: T, error?: E }` every time.

Do not use enums. Use a const object with `as const` and derive the union:

```ts
export const Status = { Draft: 'draft', Published: 'published' } as const;
export type Status = typeof Status[keyof typeof Status];
```

Inferred return types are fine for small internal helpers. Annotate
return types on any exported function or type at a package boundary.
