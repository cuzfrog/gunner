---
no-new-exports:
  - container.ts
  - main.ts
  - main.test.ts
---


# src

Composition root: `container.ts` declares the `AppCradle` and the singleton awilix container (CLASSIC injection); `main.ts` provides the root values (`canvas`, `simConfig`), registers the modules and starts the app.

Top-level directories:
- `components/` — Astro components for static markup (see `components/MODULE.md`).
- `pages/index.astro` — SPA page entry.
- `layouts/Layout.astro` — document layout (fonts, meta, CSS import).
- `styles/` — CSS bundled by Vite/Astro (see `doc/CSS_RULES.md`).
- `ui/`, `fitting/`, `gamedata/`, `appstate/` — runtime modules (each has its own `MODULE.md`).
