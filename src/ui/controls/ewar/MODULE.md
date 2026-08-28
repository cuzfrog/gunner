---
no-new-exports:
  - ewarController.ts
  - ewarController.test.ts
  - ewarControllerContract.ts
  - ewarEffectDescriber.ts
  - ewarEffectDescriber.test.ts
  - module.ts
  - index.ts
---


# ewar

Electronic-warfare activation controller and popup UI.

`EwarController` is the public abstraction and `registerEwarModule` is exported for DI registration. The module owns its DOM collection through a private `collectEwarEls` and subscribes to the shared `UiEvents.onFittingImported` channel to refresh the loadout when a fitting is imported.
