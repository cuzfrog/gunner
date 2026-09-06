---
no-new-exports:
  - portraitsController.ts
  - portraitsController.test.ts
  - portraitsControllerContract.ts
  - module.ts
  - index.ts
---

# portraits

Corner ship portraits over the canvas with incoming-effect icon rows. Public surface:
`PortraitsController`, `PortraitsEls`, `CombatantProfiles`; `registerPortraitsModule` is
exported for DI registration. The module owns its DOM collection through a private
`collectPortraitsEls`. The controller consumes `incomingOffensiveModules` from the
simulation `EngagementView` (target-indexed: weapons and ewar actively applied against
this ship) plus own-ship defense cycling effects from `DefenseController`. It does not
depend on `EwarResolver` or `EwarController` — all runtime activity is resolved by the
simulation and exposed through the view.
