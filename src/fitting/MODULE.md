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
  - fittingState.ts
  - defenseCalculator.test.ts
  - defenseCalculator.ts
  - fittingCalculator.ts
  - damageBreakdown.ts
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

Gate relaxed: `fittingState.ts`, `fittingCalculator.ts`, `damageBreakdown.ts`, `defenseCalculator.ts`, and `index.ts` were removed from `no-new-exports` to add `DroneGroup`, `droneBoosterModules`, `droneGroups`, `resolveDrones`, and `droneDamageByType` alongside the existing turret/missile fitting contracts, and to re-export `DefenseModuleStats`, `DefenseLayer`, `DefenseRepairerOverload`, `DefenseAncillary` from `gamedata/fittingDb` and `DamageResists` from `sim` for downstream defense-simulator consumption. `defenseCalculator.ts` exports `DefenseCalculator` for `FittingImport` and DI registration. These are cross-boundary DTOs and calculator methods consumed by `sim`, `app`, and `ui`. `turretStats.ts` was removed from `no-new-exports` to add `toTrackingScore` and `toTrackingRadPerSecond` alongside the existing `STANDARD_SIGNATURE_RESOLUTION` constant. The score conversion functions are fitting-domain stats shared by `fittingCalculator` (score→rad/s) and the UI tracking input control (rad/s↔score), so the fitting module is the single home for the conversion. `capacitorSim.ts` and `capacitorCalculator.ts` are new: the event-driven capacitor simulation (port of pyfa `eos/capSim.py`: closed-form regen, staggered identical modules, LCM period stability detection, cap boosters as postponed on-demand injectors) and the `CapacitorCalculator` resolving `ImportedFitting.capacitor` (capacity/rechargeTime spec with stacking, peak regen, per-module usage rows, stable % / depletion time). `runCapSim` and `buildInjectorDrains` are module-internal exports consumed by their sibling tests and `capacitorCalculator` only; they are not re-exported through `index.ts`. `CapacitorCalculatorImpl` is constructed inside `FittingImportImpl` next to `DefenseCalculatorImpl` (not a cradle dependency). `CapacitorSpec` lives in `sim/types.ts` as a cross-boundary DTO consumed by `fitting` (to produce) and later by `sim` (CombatantConfig.capacitor); `CapacitorStats`/`CapacitorUsageRow` are fitting-local DTOs re-exported through `index.ts`.

Gate note (phase 3): `capacitorCalculator.ts` (ungated) `CapacitorStats.spec` is now propulsion-independent: the MWD capacitor capacity multiplier no longer bakes into the exported spec. It applies at the consumer — `resolve()` composes an effective spec internally for `peakRecharge`/`stablePercent`/`depletesInSeconds` (pyfa parity kept), and the sim applies `ShipConfig.propulsionCapacityMultiplier` to the spec capacity. This keeps `FittedHullSummary.capacitor` (set by the import producers from `ImportedFitting.capacitor.spec`) valid across propulsion variant swaps, so the UI never holds a stale MWD-adjusted pool.

Gate note (single-source drains): `capacitorCalculator.resolve` takes a `CapacitorDrainSources` DTO (`defense`, `turrets`, `ewar`, `boosts`, `missileBoosts`, `sensorBoosts`) — the resolved products `FittingImport` already builds — and derives usage rows from them: turret rows from `ImportedTurret` (capacitorNeed/cycleTime/turretCount; the db re-lookup and index pairing into `turretGroups` are gone), ewar/booster/neutralizer rows via the sim's `scheduledDrainsFromProjections` (the exact extraction the runtime uses, grouped by moduleId with instance counts), the RAH row from `DefenseSpec.rah`, and the propulsion interval from the sim's `PROPULSION_CYCLE_SECONDS`. The `findActiveCapFamily` re-derivation and the preview-side `PROPULSION_CYCLE_TIME` constant were deleted, so the static usage table cannot diverge from the runtime drains. `CapacitorDrainSources` is re-exported through `index.ts` for downstream preview composition. `defenseCalculator.resolveRahSpec` now carries `capacitorNeed` from the db stats: previously the preview showed the RAH row but `RahSpec.capacitorNeed` stayed undefined and the sim never debited RAH activation.

Gate note (capacitor skill chain): `skillMultiplier.ts` is new (file-private to the module; not re-exported through `index.ts`): `moduleSkillMultiplier(db.skillBonuses, requiredSkillIds, bonusType, skillLevel, moduleGroupId?)` multiplies a module's attr by every `SkillBonus` whose `requiredSkillId` (or `moduleGroupId`) the module carries, composing per-skill factors. The db now classifies semantic attrs 6/73 as `capUse`/`duration` (`SkillBonusType` and `HullBonusAttribute` gained `ModuleBonusAttribute`), charges carry `capacitorNeedMultiplier` (attr 317), and the nine cap-consuming families plus propulsion carry `requiredSkillIds`. `fittingCalculator.resolveTurrets` applies the full turret capNeed chain (raw x charge multiplier x skill `capUse` x hull `capUse`, the hull path gated to turret skills/groups, mirroring attr 795 hull bonuses); `resolveEwar`/`resolveBoosts`/`resolveMissileBoosts`/`resolveSensorBoosts` apply the `capUse` skill multiplier to their specs. `capacitorCalculator` gained `CapacitorTurretDrain` (`CapacitorDrainSources.turretDrains`, replacing the raw `ImportedTurret[]`) and resolves the propulsion row with `capUse` x `duration` skill multipliers from `FittingPropulsionStats.cycleTime`, so preview rows, runtime drains, and pyfa agree (killmail Harbinger parity test: 28.111 GJ/s, depletes 277.5s vs pyfa 276.7s at all-fives). `CapacitorStats` gained `weaponsPerSecond` (the lock-gated turret subset of `usagePerSecond`, computed from the same `turretDrains` the turret rows come from) so the sim's engagement-aware net can subtract exactly the weapons while no lock is held.

Gate note (fitting resources): `fittingResourcesCalculator.ts` is new: `FittingResourcesCalculator` resolves the soft powergrid/CPU fitting readout (`FittingResources` = used vs output per resource, display only, nothing blocks import or sim). Needs come from the generated `db.needs` table (turret/launcher groups by count, all fitted module lists, command bursts; offline modules are already dropped by the factory), reduced by skill rows (`cpuNeed`/`powerGridNeed` via `moduleSkillMultiplier`), matching hull rows (`moduleSkillId`/`moduleGroupId` scoped, per-level scaling, floored at zero), and rig need drawbacks (`RigDrawback.targetGroupId`/`targetSkillId`, reduced via `applyRigDrawbackReduction`). Output = (profile base + hull `powerGridFlat`/`cpuFlat`) x stacking-penalized module+hull `powerGridOutputPercent`/`cpuOutputPercent` chain (including rig cpu-output drawbacks) x hardcoded Engineering/CPU Management 5%/level (uniform skill model, precedent `_computeDroneControlRange`). Flat-vs-multiplier order matches `capacitorCalculator` (base+flat first). `applyRigDrawbackReduction` moved from `fittingCalculator` to `skillMultiplier` (shared by both calculators); its tests moved to `skillMultiplier.test.ts`. `FittingImportImpl` constructs the calculator next to `DefenseCalculatorImpl`; `ImportedFitting.resources` and `FittingSummary.resources` (static level-5 preview) feed the fitting preview popup, and `ShipProfile.powerGrid`/`cpuOutput` feed the ship hint.

Known gaps (pre-existing, documented for follow-up): the runtime pool (`FittedHullSummary.capacitor`) and the ewar/booster spec amounts are resolved at import conditions and are not re-resolved when the user changes the skill level without re-importing (the capacitor popup recomputes live via `resolveCapacitorStats`; the sim does not). Repairer rows apply no capacitor skill multipliers (repairer skills are not classified to `capUse`).

Gate note (strategic cruiser subsystems): subsystems are resolved as fitting modules and their per-level bonuses merge into `FittingState.hullBonuses` (ship bonuses first, then each online subsystem's `subsystemBonuses[id]` rows from the db) — the single integration point downstream pipelines already consume. `HullBonus` gained `damageType?` (per-type hull damage rows, e.g. legacy missile damage effects emit four typed rows) and `sourceId?` (the bonus-producing subsystem's type id, for damage attribution). Missile and drone skill models split the damage pools: whole-ship rows multiply everything, ship rows carrying a `damageType` and subsystem rows apply only when the type matches the weapon's damage, keeping `ammo × product(factors) = volley` exact. `DamageFactorKind` gained `"subsystem"`; `DamageFactor` carries optional `damageType` so the dps hint can tag typed factors. Subsystem stat bonuses (velocity, agility, shield/armor HP, MWD sig bloom) flow through the existing hull-bonus consumers in `fittingCalculator` and `defenseCalculator` unchanged. Per-level scaling uses the global `StatConditions.skillLevel` (the per-race subsystem skill is not modelled separately).
