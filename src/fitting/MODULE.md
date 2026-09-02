---
no-new-exports:
  - chargeCatalog.test.ts
  - chargeCatalog.ts
  - cradle.ts
  - damageBreakdown.test.ts
  - eft.test.ts
  - eft.ts
  - fittingImport.test.ts
  - fittingImport.ts
  - fittingOverrides.test.ts
  - fittingOverrides.ts
  - fittingState.test.ts
  - gunFamilies.test.ts
  - gunFamilies.ts
  - launcherClasses.test.ts
  - launcherClasses.ts
  - missileCatalog.test.ts
  - missileCatalog.ts
  - missileStats.test.ts
  - missileStats.ts
  - droneCatalog.ts
  - droneCatalog.test.ts
  - droneLoadoutResolver.ts
  - droneLoadoutResolver.test.ts
  - droneLoadoutValidator.ts
  - droneLoadoutValidator.test.ts
  - droneStats.ts
  - droneStats.test.ts
  - fittingCalculator.test.ts
  - module.ts
  - presetFittings.test.ts
  - presetFittings.ts
  - turretStats.ts
---

# fitting

EFT fitting import support. The module is responsible for parsing EFT text,
resolving fitted modules and charges against the generated fitting database,
aggregating exact ship and turret statistics for the `Ships` engine, and
extracting the fitted ewar loadout (stasis webs, tracking disruptors, and
scripts) for the `sim` module.

The public boundary is `index.ts`, which exports the `FittingImport`,
`ChargeCatalog`, `MissileCatalog`, `MissileSkillModel`, `DroneCatalog`,
`DroneSkillModel`, `PresetFittings`, `GunFamilies`, and `LauncherClasses`
abstractions, `ImportedFitting`, `ImportedTurret`, `ImportedLauncher`,
`ImportedDrone`, `CargoCharge`, `ChargeOption`, `MissileOption`,
`DroneOption`, `PresetFitting`, `FittingRow`, `FittingSection`,
`FittingSummary`, `LauncherClass`, `FittingState`, `FittedModule`,
`TurretGroup`, `LauncherGroup`, `DroneGroup`, `CargoEntry`,
`FittingModuleEntry`, `DamageType` (re-exported from `sim`),
`DamageFactor`, `DamageFactorKind`, `DamageBreakdown`,
`EMPTY_DAMAGE_BREAKDOWN`, `DefenseModuleStats`, `DefenseResists`,
`DefenseLayer`, `DefenseRepairerOverload`, `DefenseAncillary` (re-exported
from `gamedata/fittingDb`), and the module registration.
`chargeDamageByType`, `missileDamageByType`, and `droneDamageByType` are
sibling-only helpers used within the fitting module and are not
re-exported through `index.ts`. `ImportedTurret.damagePerShot` and
`ImportedLauncher.damagePerMissile` are `DamageVector` (from `sim`),
carrying per-type damage through the fitting pipeline so the sim and UI
consume the same typed data. `FittingState` represents the equipped
fitting basis (hull, support modules, turret groups, launcher groups,
propulsion, ewar, boosters, missile boosters, drone boosters, drone
groups, drones, cargo) without computed values.
`FittingStateFactory` builds `FittingState` from resolved module entries
and `FittingDb`. `FittingCalculator` computes turrets, launchers, drones,
hull, propulsion, ewar, boosts, and cargo charges from a `FittingState`
plus `StatConditions`. `DefenseCalculator` resolves `DefenseSpec` (layer
HP, resists, shield recharge, repairers) from `FittingState.defenseModules`
plus `ShipProfile` and `StatConditions`, paralleling `FittingCalculator`'s
weapon resolution. `ImportedFitting.defense` carries the resolved
`DefenseSpec` for downstream sim and UI consumption. `FittingOverrides` and `FittingOverridesStore`
represent user fitting-level changes (replacing equipped turret/launcher
modules, charges, or propulsion). `applyFittingOverrides` patches a
`FittingState` with overrides, producing a new state for the calculator.
`ImportedFitting.fittingState` carries the basis for later recomputation.
`ChargeCatalog` adds `has(charge)` so persistence modules can existence-check stored charge
ids without reaching into the catalog's internal record.
`ChargeCatalog` adds `equivalentInSize(charge, chargeSize)` for
charge-size equivalence checks. `MissileCatalog` lists missile charges
compatible with a launcher and re-derives effective values via
`MissileSkillModel` when switching ammunition. `MissileCatalog` adds
`equivalentInGroups(missile, chargeGroups)` for charge-group equivalence
checks. `LauncherClasses` maps launcher module IDs to `LauncherClass`
values and provides representative modules per class.
`ImportedFitting.launcher` is an optional `ImportedLauncher` parallel to
`turret`. `ImportedFitting.ewar` is an `EwarLoadout` from the `sim`
boundary. `FittingImport` consumes a `StackingPenalty` from the `sim`
boundary via DI. `FittingImport.summarize` produces a structural fitting
summary for UI previews. Icon and drone image identifiers have moved to
the `src/ui` module because they are presentational data. Generated game
data (fitting database, module slots, item names, and fitting presets)
lives in `src/gamedata` and is consumed through typed DI accessors.
Internal files such as `eft.ts`, `fittingImport.ts`, `chargeCatalog.ts`,
`gunFamilies.ts`, `launcherClasses.ts`, `missileCatalog.ts`,
`missileStats.ts`, `droneCatalog.ts`, `droneStats.ts`, and
`presetFittings.ts` and their sibling tests are reached only by their
sibling tests and by `module.ts`.

Gate relaxed: `fittingState.ts`, `fittingCalculator.ts`, `damageBreakdown.ts`, `defenseCalculator.ts`, and `index.ts` were removed from `no-new-exports` to add `DroneGroup`, `droneBoosterModules`, `droneGroups`, `resolveDrones`, and `droneDamageByType` alongside the existing turret/missile fitting contracts, and to re-export `DefenseModuleStats`, `DefenseLayer`, `DefenseRepairerOverload`, `DefenseAncillary` from `gamedata/fittingDb` and `DamageResists` from `sim` for downstream defense-simulator consumption. `defenseCalculator.ts` exports `DefenseCalculator` for `FittingImport` and DI registration. These are cross-boundary DTOs and calculator methods consumed by `sim`, `app`, and `ui`.
