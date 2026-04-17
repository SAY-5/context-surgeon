---
paths:
  - "**/*.rb"
  - "Gemfile"
---

# Ruby on Rails conventions

Use Rubocop with the standard config (`bundle exec rubocop`). Keep Rails
migrations reversible — if you can't write a clean `down`, split the
migration.

Prefer service objects over fat models. Controllers stay thin; they parse
params, call a service, and render a response.
