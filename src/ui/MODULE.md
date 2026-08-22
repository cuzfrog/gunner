---
no-new-exports:
  # - controls.ts          # moved into src/ui/controls/ sub-module
  # - controls.test.ts     # moved into src/ui/controls/ sub-module
  # - index.ts  # ClipboardProvider/LocationProvider/StorageProvider and ClipboardUnavailableError are cross-boundary DI contracts used by the root container and composition root
  - loop.ts
  - module.ts
  - renderer.ts
  # - trackingInput.test.ts # moved into src/ui/controls/ sub-module
  # - trackingInput.ts      # TrackingUnit moved to settings.ts; file moved into src/ui/controls/ sub-module
  - i18n.test.ts
  - i18n.ts
  - savedFittings.test.ts
  - settings.test.ts
  - savedFittings.ts
  # - settings.ts  # ProfileSettings is a cross-boundary DTO, exempt from no-new-exports
  - renderer.test.ts
---



# ui

Browser presentation and input: DOM form controls, canvas renderer, and the requestAnimationFrame fixed-step loop.

`DomControls` reads turret/scenario settings from the form, seeds the initial distance with the best hit-chance range via the injected `hitChance`, and mirrors per-frame engagement readouts back into the DOM. `DomControls` and `LocalSettingsStore` consume the injected `Ships` service for hull lookup, localized hull read models, propulsion validation, fitting options, and effective-stat calculations. Import buttons let the attacker and target be populated from an EFT fitting via the injected `FittingImport`. `Loop.setTickHandler` receives the fixed-step callback from the app so the loop stays free of simulation knowledge.

DI wiring: `module.ts` registers `controls`, `renderer` and `loop` against the singleton `container` in `src/container.ts`. The `canvas` consumed by `renderer` and the `Ships` domain service are provided by the composition root.
