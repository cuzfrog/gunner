---
no-new-exports:
  - index.ts
  - loop.ts
  - module.ts
  - palette.ts
  - palette.test.ts
  - renderer.ts
  - renderer.test.ts
  - timer.ts
  - timer.test.ts
  - events.ts
  - events.test.ts
  - cradle.ts
  - iconIds.ts
---




# ui

Browser presentation and input: DOM form controls, canvas renderer, requestAnimationFrame loop, and the i18n/icons sub-modules. Persistence is handled by the top-level `appstate` module, which is consumed through its index. The `testing/` sub-module is test-only: fake DOM, mocks, and shared fixtures.

`DomControls` reads turret/scenario settings from the form, seeds the initial distance with the best hit-chance range via the injected `hitChance`, and mirrors per-frame engagement readouts back into the DOM. `DomControls` and `appstate` consume the injected `Ships` service for hull lookup, localized hull read models, propulsion validation, fitting options, and effective-stat calculations. Import buttons let the attacker and target be populated from an EFT fitting via the injected `FittingImport`. `Loop.setTickHandler` receives the fixed-step callback from the app so the loop stays free of simulation knowledge.

The `appstate` module owns persistence (`LocalSettingsStore`), saved fittings (`LocalSavedFittings`), and profile sharing (`profileText`). The `i18n/` sub-module owns language switching, the dictionary, and localized hint/lore content data. The `icons/` sub-module owns the static image catalog; `iconIds.ts` and `droneIconIds.ts` are generated data files internal to that module.

DI wiring: `module.ts` composes the `controls`, `i18n`, `appstate`, and `icons` modules and registers `renderer`, `loop`, and `timer` against the singleton `container` in `src/container.ts`. The `canvas` consumed by `renderer` and the `Ships` domain service are provided by the composition root.
