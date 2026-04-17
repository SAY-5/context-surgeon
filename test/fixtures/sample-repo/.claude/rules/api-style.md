---
paths:
  - "src/api/**/*.py"
---

# API style

All endpoints return a JSON envelope: `{ "data": <payload>, "error": null }`.

Validation errors return HTTP 422 with the standard Pydantic error list
under `error.details`, and a short human-readable summary under `error.message`.

Pagination uses opaque cursors, not page numbers. The cursor is returned
in the response under `data.next_cursor`; pass it back via the `?cursor=`
query parameter.
