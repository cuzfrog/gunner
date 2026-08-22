---
no-new-exports:
  # - controls.ts          # moved into src/ui/controls/ sub-module
  # - controls.test.ts     # moved into src/ui/controls/ sub-module
  - index.ts  # public surface re-exports cross-boundary DI contracts and DTOs
  - loop.ts
  - module.ts
  - renderer.ts
  # - trackingInput.test.ts # moved into src/ui/controls/ sub-module
  - renderer.test.ts
---

# ui

Browser presentation, input, and persistence: DOM form controls, canvas renderer, requestAnimationFrame loop, and the settings/i18n/icons sub-modules.

`DomControls` reads turret/scenario settings from the form, seeds the initial distance with the best hit-chance range via the injected `hitChance`, and mirrors per-frame engagement readouts back into the DOM. `DomControls` and `LocalSettingsStore` consume the injected `Ships` service for hull lookup, localized hull read models, propulsion validation, fitting options, and effective-stat calculations. Import buttons let the attacker and target be populated from an EFT fitting via the injected `FittingImport`. `Loop.setTickHandler` receives the fixed-step callback from the app so the loop stays free of simulation knowledge.

The `settings/` sub-module owns persistence (`LocalSettingsStore`), saved fittings (`LocalSavedFittings`), and profile sharing (`profileText`). The `i18n/` sub-module owns language switching and the dictionary. The `icons/` sub-module owns the static image catalog; `iconIds.ts` and `droneIconIds.ts` are generated data files internal to that module.

DI wiring: `module.ts` registers `controls`, `renderer`, `loop`, `settingsStore`, `savedFittings`, `i18n`, `imageCatalog` and `timer` against the singleton `container` in `src/container.ts`. The `canvas` consumed by `renderer` and the `Ships` domain service are provided by the composition root.
