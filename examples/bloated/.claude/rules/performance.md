# Performance

Measure before optimising. `pnpm bench` for the app-level benchmarks.

Common wins: eliminate N+1, add the right index, batch writes, stream
large responses. In that order of impact.

Avoid: micro-benchmarks on inlining, hand-rolled for loops in the name
of speed, rewrites driven by a profile run against an unrealistic
dataset.
