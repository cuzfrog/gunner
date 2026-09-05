---
no-new-exports:
  - app.test.ts
  - app.ts
  - cradle.ts
  - index.ts
  - module.ts
---



# app

Application orchestration: `App.start` wires the controls callbacks, loop speed and tick handler, subscribes to `engine.events().onViewUpdated` for rendering and `onShipDestroyed` for loop stop, then renders the initial frame. `App.tick` is a one-line delegate to `EngagementEngine.step`; all rendering and death handling is event-driven through the engine's event surface. AppImpl depends only on `Controls`, `EngagementEngine`, `Renderer`, and `Loop` — no sub-simulator types.

DI wiring: `module.ts` registers `app` against the singleton `container` in `src/container.ts`.
