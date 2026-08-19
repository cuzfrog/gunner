---
no-new-exports:
  - container.ts
  - main.ts
  - build.test.ts
  - main.test.ts
---


# src

Composition root: `container.ts` declares the `AppCradle` and the singleton awilix container (CLASSIC injection); `main.ts` provides the root values (`canvas`, `simConfig`), registers the modules and starts the app.
