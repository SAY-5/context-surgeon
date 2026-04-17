# Security

Secrets come from Doppler. `.env` files are for local dev only; do not
commit anything that looks like a secret.

Every external input validates through Zod at the API boundary. Handlers
receive typed, validated input; they do not re-check.

Raw SQL is exceptional and requires a reviewer's sign-off. String
interpolation on user input anywhere near a query is a security
incident, held as one.

Auth is Clerk. Use the RBAC helpers in `packages/auth`; do not roll
your own session logic.

All user input hits Zod validation at the API boundary. No exceptions.
If the schema does not match, the request is rejected with a 400 and a
structured error.
