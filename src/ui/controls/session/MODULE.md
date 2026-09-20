---
no-new-exports:
  - hullDatalist.ts
  - sessionCodec.ts
  - sessionCodec.test.ts
  - module.ts
  - startupDefaults.ts
  - module.test.ts
  - simConfigSource.ts
  - simConfigSource.test.ts
  - capacitorStatsSource.ts
  - capacitorStatsSource.test.ts
  - index.ts
  - hullDatalist.test.ts
---





# session

Session state, URL encoding, and hull datalist.

The public surface is the abstraction types: `SessionCodec`, `HullDatalist`, `SimConfigSource`, and `CapacitorStatsSource`. The module owns its DOM collection through a private `collectSessionCodecEls`; `HullDatalist` now receives only the `hullOptions` element it needs. `SessionCodec` depends on `SettingsParser` for wire/session conversion: `restore` operates on `SessionSettings`, `fromProfile` delegates to `parser.fromProfile`, and `applyShipState` reads `settings.shipA`/`settings.shipB` directly, projecting each `CombatantSettings` to a `SidePanelState` internally. `SessionCodec` subscribes to `UiEvents` profile events (`profileLoaded`, `newProfile`, `profileTextLoaded`) and emits `sessionRestored`, `sessionReset` and `startupDefaultsApplied` after restoring, resetting or applying defaults.

Gate relaxed (live capacitor preview): `capacitorStatsSource.ts` is new and exports `CapacitorStatsSource` (module-internal abstraction; `index.ts` surface unchanged — the cradle wires it through a structural entry). The source re-derives `CapacitorStats` per side from the imported fitting skeleton plus live user selections (propulsion module id from `capture().fittedHull`, ewar/booster/missile/sensor loadout projections, skill conditions) through `FittingImport.resolveCapacitorStats`, so the capacitor popup can no longer diverge from the runtime drains after post-import mutations. The import event registers the skeleton; `SessionCodec.restoreCapacitor` calls `register` at the restore boundary (no import event fires there) and drops its direct `capacitorController.setCapacitorStats` call.

Gate note (live turret drains, propulsion, and fitted net): `capacitorStatsSource.ts` deps gained `turretControllers: Record<Side, TurretDrainSource>` (file-private interface: `currentTurretSpecs()`), and `drainSources` now maps the live turret specs into `CapacitorDrainSources.turretDrains` — the popup's turret rows are the exact specs the runtime weapon clocks drain, override-aware. `simConfigSource.ts` deps gained `capacitorStatsSource` and `capacitorSide` composes `CapacitorSideConfig.propulsion` from the preview row matching the live propulsion module id (same toggle-off gate as the popup: `fittedHull.propulsionId` cleared means no drain), so the runtime propulsion amount/interval are the skill-modified preview values; it also composes `CapacitorSideConfig.fittedDrainPerSecond` from the same stats' `usagePerSecond` and `weaponsDrainPerSecond` from `weaponsPerSecond` (the lock-gated turret subset the sim subtracts while no lock is held), making the runtime net's drain basis identical to the popup's Usage row whenever the engagement allows every module to act (net + usage − incoming = regen). `SidePanelState.propulsionCapNeed` was removed (superseded by the drain row); `propulsionCapacityMultiplier` stays for the effective pool.

Gate note (command bursts): `simConfigSource.ts` `buildCombatantConfig` passes `capacitorStatsSource.commandBursts(side)` (the imported fitting's resolved burst specs, shared with the capacitor drain source) into `CombatantConfig.commandBursts`. Body-only change, no new exports.
