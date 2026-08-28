---
no-new-exports:
  - chargeCatalog.test.ts
  - chargeCatalog.ts
  - cradle.ts
  - eft.test.ts
  - eft.ts
  - fittingImport.test.ts
  - fittingImport.ts
  - gunFamilies.test.ts
  - gunFamilies.ts
  - index.ts
  - missileCatalog.test.ts
  - missileCatalog.ts
  - missileStats.test.ts
  - missileStats.ts
  - module.ts
  - presetFittings.test.ts
  - presetFittings.ts
  - turretCatalog.test.ts
  - turretCatalog.ts
  - turretStats.ts
---

# fitting

EFT fitting import support. The module is responsible for parsing EFT text,
resolving fitted modules and charges against the generated fitting database,
aggregating exact ship and turret statistics for the `Ships` engine, and
extracting the fitted ewar loadout (stasis webs, tracking disruptors, and
scripts) for the `sim` module.

The public boundary is `index.ts`, which exports the `FittingImport`,
`ChargeCatalog`, `MissileCatalog`, `MissileSkillModel`, `PresetFittings`,
`GunFamilies`, and `TurretCatalog` abstractions, `ImportedFitting`,
`ImportedTurret`, `ImportedLauncher`, `CargoCharge`, `ChargeOption`,
`MissileOption`, `PresetFitting`, `FittingRow`, `FittingSection`,
`FittingSummary`, and the module registration. `ChargeCatalog` adds
`has(charge)` so persistence modules can existence-check stored charge
ids without reaching into the catalog's internal record.
`ChargeCatalog` adds `equivalentInSize(charge, chargeSize)` so
`TurretCatalog` can preserve the user's ammo selection when switching
weapon size class. `TurretCatalog` resizes a fitted turret to a
different signature-resolution class by swapping to the same-family
representative module and recomputing stats with skill multipliers.
`MissileCatalog` lists missile charges compatible with a launcher and
re-derives effective values via `MissileSkillModel` when switching
ammunition. `ImportedFitting.launcher` is an optional `ImportedLauncher`
parallel to `turret`. `ImportedFitting.ewar` is an `EwarLoadout` from
the `sim` boundary. `FittingImport` consumes a `StackingPenalty` from the `sim`
boundary via DI. `FittingImport.summarize` produces a structural fitting
summary for UI previews. Icon and drone image identifiers have moved to the
`src/ui` module because they are presentational data. Generated game data
(fitting database, module slots, item names, and fitting presets) lives in
`src/gamedata` and is consumed through typed DI accessors. Internal files such
as `eft.ts`, `fittingImport.ts`, `chargeCatalog.ts`, `gunFamilies.ts`,
`missileCatalog.ts`, `missileStats.ts`, and `presetFittings.ts` and their
sibling tests are reached only by their sibling tests and by `module.ts`.
