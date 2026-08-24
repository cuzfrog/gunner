---
no-new-exports:
  - ammoList.ts
  - sigResButtons.ts
  - sigResIcons.ts
  - turretController.ts
  - turretControllerContract.ts
  - turretEls.ts
  - turretInputSet.ts
  - turretStateResolver.ts
  - turretOverrides.ts
  - testSupport.ts
  - module.ts
  - turretController.test.ts
  - index.ts
  - module.test.ts
---



# turret

Turret input, state resolution, ammo rendering, and signature-resolution UI.

The public surface is `TurretController`. The module owns its DOM collection through a private `collectTurretEls`.
