---
no-new-exports:
  - launcherController.ts
  - launcherControllerContract.ts
  - module.ts
  - index.ts
  - testSupport.ts
  - launcherController.test.ts
  - launcherClassSwitch.test.ts
---


# launcher

Missile launcher read-only telemetry panel and ammunition selector.

The public surface is `LauncherController`. The module owns its DOM collection
through `collectLauncherEls`. `LauncherController` depends on `MissileCatalog`
from the `fitting` module to re-derive effective missile values when the user
switches ammunition.
Gate note (updateConditions): `launcherControllerContract.ts` (gated) adds the `updateConditions(conditions)` interface member — re-resolves the fitted launcher under new skill conditions from the stored fitting state and overrides, preserving the selected charge without emitting config invalidation (the caller persists once). Body and interface-member changes only, no new exports.
