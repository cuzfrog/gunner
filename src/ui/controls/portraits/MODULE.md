---
no-new-exports:
  - portraitsController.ts
  - portraitsController.test.ts
  - portraitsControllerContract.ts
  - module.ts
  - index.ts
---

# portraits

Corner ship portraits over the canvas with incoming-effect icon rows. Public surface: `PortraitsController`, `PortraitsEls`, `CombatantProfiles`; `registerPortraitsModule` is exported for DI registration. The module owns its DOM collection through a private `collectPortraitsEls`.
