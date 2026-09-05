---
no-new-exports:
  - app.test.ts
  - app.ts
  - cradle.ts
  - index.ts
  - module.ts
---



# app

Application orchestration: `App.start` wires the controls callbacks, loop speed and tick handler, then renders; `App.tick` delegates to `EngagementEngine.step`, checks death in the returned `EngineView`, and renders the frame. AppImpl depends only on `Controls`, `EngagementEngine`, `Renderer`, and `Loop` — no sub-simulator types.

DI wiring: `module.ts` registers `app` against the singleton `container` in `src/container.ts`.
