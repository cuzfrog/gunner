---
no-new-exports:
  - controls.ts
  - index.ts
  - loop.ts
  - module.ts
  - renderer.ts
  - controls.test.ts
  - i18n.test.ts
  - i18n.ts
  - settings.test.ts
  - settings.ts
  - trackingInput.test.ts
  - trackingInput.ts
---



# ui

Browser presentation and input: DOM form controls, canvas renderer, and the requestAnimationFrame fixed-step loop.

`DomControls` reads turret/scenario settings from the form, seeds the initial distance with the best hit-chance range via the injected `hitChance`, and mirrors per-frame engagement readouts back into the DOM. `Loop.setTickHandler` receives the fixed-step callback from the app so the loop stays free of simulation knowledge.

DI wiring: `module.ts` registers `controls`, `renderer` and `loop` against the singleton `container` in `src/container.ts`. The `canvas` consumed by `renderer` is provided by the composition root.
