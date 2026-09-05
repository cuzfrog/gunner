---
no-new-exports:
  - targetingController.ts
  - targetingController.test.ts
  - targetingControllerContract.ts
  - module.ts
  - index.ts
---


# targeting

Targeting field popup controller. Shows sensor attributes (scan resolution, max targeting range, max locked targets) and fitted sensor booster / signal amplifier modules in a side-panel popup.

`TargetingController` is the public abstraction and `registerTargetingModule` is exported for DI registration. The module owns its DOM collection through a private `collectTargetingEls` and subscribes to the shared `UiEvents.onFittingImported` channel to refresh sensor data when a fitting is imported.
