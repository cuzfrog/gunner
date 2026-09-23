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

The public surface is `TurretController`. The module owns its DOM collection through a private `collectTurretEls`. `TurretController` depends on `FittingCalculator`, `FittingOverridesStore`, and `DimensionedSelection<TurretDimension>` from the `fitting` and `selectionSession` modules to recompute the fitted turret when the user switches weapon-size class, variant, or ammunition. User selections are written as fitting overrides against the original module; the calculator resolves the final turret projection from the patched `FittingState`.
Gate note (updateConditions): `turretControllerContract.ts` (gated) adds the `updateConditions(conditions)` interface member — re-resolves the fitted turret under new skill conditions from the stored fitting state and overrides, preserving charge, variant, and raw-input selections without emitting config invalidation (the caller persists once). Body and interface-member changes only, no new exports.
