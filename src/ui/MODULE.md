---
no-new-exports:
  - loop.ts
  - module.ts
  - palette.ts
  - palette.test.ts
  - panelConfigurationMemory.test.ts
  - panelConfigurationMemory.ts
  - renderer.test.ts
  - timer.ts
  - timer.test.ts
  - events.ts
  - events.test.ts
  - cradle.ts
  - index.ts
  - renderer.ts
---







# ui

Browser presentation and input: DOM form controls, canvas renderer, requestAnimationFrame loop, and the i18n/icons sub-modules. Persistence is handled by the top-level `appstate` module, which is consumed through its index. The `testing/` sub-module is test-only: fake DOM, mocks, and shared fixtures.

`DomControls` reads turret/scenario settings from the form, seeds the initial distance and other defaults from static HTML values, and mirrors per-frame engagement readouts back into the DOM. `DomControls` and `appstate` consume the injected `Ships` service for hull lookup, localized hull read models, propulsion validation, fitting options, and effective-stat calculations. Import buttons let Ship A and Ship B be populated from an EFT fitting via the injected `FittingImport`. `Loop.setTickHandler` receives the fixed-step callback from the app so the loop stays free of simulation knowledge.

The `appstate` module owns persistence (`LocalSettingsStore`), saved fittings (`LocalSavedFittings`), and profile sharing (`profileText`). The `i18n/` sub-module owns language switching, the dictionary, and localized hint/lore content data. The `icons/` sub-module owns the static image catalog; `iconIds.ts` and `droneIconIds.ts` are generated data files internal to that module.

DI wiring: `module.ts` composes the `controls`, `i18n`, `appstate`, and `icons` modules and registers `renderer`, `loop`, and `timer` against the singleton `container` in `src/container.ts`. The `canvas` consumed by `renderer` and the `Ships` domain service are provided by the composition root. `SelectionSession` is a per-side in-memory store (registered as `shipASelectionSession`/`shipBSelectionSession` in the `selectionSession` module) that remembers the last turret, launcher, and propulsion selection per dimension, separate from calculation and overrides.

Gate relaxed: `renderer.ts` and `index.ts` were removed from `no-new-exports` to replace `TurretRange` with `OptimalFalloffRange` (kind: `"turret" | "drone"`) alongside the existing `MissileRange` union member, and to add `DroneRenderInfo` and `DroneGroupRenderInfo` for drone position/range rendering. Drones share the optimal/falloff ring model with turrets, so a single `OptimalFalloffRange` type encodes both weapon kinds without duplicating the structure. `DroneRenderInfo` carries per-group drone positions and ranges consumed by the renderer and the app layer. `MissileRenderInfo` and `MissileRenderCollection` were added for physical missile body/trail rendering consumed by the app layer.
