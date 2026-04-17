# API design

GraphQL via Pothos. Every query/mutation has input and output types.
Mutations return discriminated union result types. Domain errors are
modelled in the schema; infra errors become GraphQL errors.

DataLoader is mandatory for resolvers that fetch related entities.

This overlaps heavily with CLAUDE.md's API design section. Kept
separate to "allow scoping" but it always loads.
