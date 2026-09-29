---
no-new-exports:
  - targetingController.ts
  - targetingController.test.ts
  - targetingControllerContract.ts
  - module.ts
  - index.ts
---


# targeting

Targeting field popup controller. Shows sensor attributes (scan resolution, lock time against the opponent's config base signature radius, max targeting range, max locked targets) in a side-panel popup. Lock time is computed with the sim's exported `lockTime` formula from the boosted scan resolution; the opponent signature is supplied through the `sigSource` dep adapted from the side panels in `module.ts`.

`TargetingController` is the public abstraction and `registerTargetingModule` is exported for DI registration. The module owns its DOM collection through a private `collectTargetingEls` and subscribes to the shared `UiEvents.onFittingImported` channel to refresh sensor data when a fitting is imported.
The popup also owns the per-side attack-drones tactic toggle (`TargetingController.attackDrones(side)`), rendered as a checkbox row below the sensor attributes; toggling emits the shared configInvalidated event so the sim config picks it up.
The popup re-renders on open and on config/language events so the lock time row always reflects the current opponent signature.
