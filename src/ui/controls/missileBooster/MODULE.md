---
no-new-exports:
  - missileBoosterController.test.ts
  - missileBoosterController.ts
  - missileBoosterEffectDescriber.test.ts
  - missileBoosterEffectDescriber.ts
  - module.ts
  - missileBoosterControllerContract.ts
  - index.ts
---


# missileBooster

Interactive missile guidance computer and enhancer module UI. Mirrors the ewar/booster controller pattern for per-side computer toggles, overload, and script selection; enhancers are passive display rows.

`MissileBoosterController` is the public abstraction and `registerMissileBoosterModule` is exported for DI registration. `MissileBoosterEffectDescriber` centralizes bonus formatting for summary tooltips and per-module hover titles, mirroring `EwarEffectDescriber`. The module owns its DOM collection through the shared `ControlsEls` missile-booster entries and subscribes to the shared `UiEvents.onFittingImported` channel to refresh the loadout when a fitting is imported.
