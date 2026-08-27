---
no-new-exports:
  - ammoList.ts
  - sigResIcons.ts
  - turretController.ts
  - turretControllerContract.ts
  - testSupport.ts
  - module.ts
  - module.test.ts
  - turretEls.ts
  - turretController.test.ts
  - index.ts
  - turretInputSet.ts
  - turretStateResolver.ts
  - turretOverrides.ts
---




# turret

Turret input, state resolution, ammo rendering, and signature-resolution UI.

The public surface is `TurretController`. The module owns its DOM collection through a private `collectTurretEls`.
