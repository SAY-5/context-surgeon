---
paths:
  - "**/*.java"
  - "**/pom.xml"
  - "**/build.gradle"
---

# Java / Spring Boot

The Java bits of the system are in a separate repo, but the rule is
here for when we pair across repos.

- Maven over Gradle unless the project started on Gradle.
- Lombok is banned. Write the getters. Yes, all of them.
- Spring Boot profiles via `application-<env>.yaml`, not via
  `-Dspring.profiles.active=`.
- Use `@Transactional` deliberately, not as a default. Every method
  annotated is a method that commits a transaction; that is not free.
- Prefer constructor injection over `@Autowired` on fields.
