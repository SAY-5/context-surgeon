---
paths:
  - "**/*.rb"
  - "Gemfile"
  - "Rakefile"
  - "config/routes.rb"
---

# Ruby on Rails

Rubocop standard config. Reversible migrations. Thin controllers —
parse params, call a service, render.

Prefer service objects over fat models. Keep domain logic out of
callbacks; callbacks are for cross-cutting concerns (touch timestamps,
fire events), not business rules.

Use `bundle exec` in scripts to avoid picking up a different Gemfile.

This rule is kept around for the internal billing reconciliation tool
that still has a few Rake tasks, but most of the codebase is
TypeScript these days.
