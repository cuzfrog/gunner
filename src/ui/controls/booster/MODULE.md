---
no-new-exports:
  - boosterController.test.ts
  - boosterController.ts
  - module.test.ts
  - module.ts
---

# booster

Interactive turret booster module UI. Mirrors the EWAR controller pattern for per-side tracking computer toggles and script selection.

`BoosterController` is the public abstraction and `registerBoosterModule` is exported for DI registration. The module owns its DOM collection through a private `collectBoosterEls` and subscribes to the shared `UiEvents.onFittingImported` channel to refresh the loadout when a fitting is imported.
