---
no-new-exports:
  - launcherController.ts
  - launcherControllerContract.ts
  - module.ts
  - index.ts
  - testSupport.ts
  - launcherController.test.ts
---

# launcher

Missile launcher read-only telemetry panel and ammunition selector.

The public surface is `LauncherController`. The module owns its DOM collection
through `collectLauncherEls`. `LauncherController` depends on `MissileCatalog`
from the `fitting` module to re-derive effective missile values when the user
switches ammunition.
