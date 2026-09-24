---
no-new-exports:
  - combatantSide.ts
  - controlsDom.ts
  - domControls/domControls.ts
  - domControls/domControlsContract.ts
  - domControls/readoutPresenter.ts
  - domControls/module.ts
  - domControls/MODULE.md
  - effectiveReadout/effectiveReadout.ts
  - elements.ts
  - engagementReadout/engagementReadout.ts
  - hints/hintRotator.ts
  - hints/module.ts
  - import/shipATurret.ts
  - import/eftSideImporter.ts
  - import/importController.testSupport.ts
  - import/importController.ts
  - import/importControllerContract.ts
  - import/module.ts
  - import/profileTextImporter.ts
  - share/index.ts
  - share/module.ts
  - share/shareController.ts
  - share/shareController.test.ts
  - share/shareControllerContract.ts
  - share/MODULE.md
  - module.ts
  - popup/fittingPopupController.ts
  - popup/fittingPopupEls.ts
  - popup/fittingPopupRenderer.ts
  - popup/fittingPreview.ts
  - popup/fittingPreviewManager.ts
  - popup/module.ts
  - popup/popupGroup.ts
  - preferences/preferencesController.ts
  - profile/profileController.ts
  - session/hullDatalist.ts
  - session/module.ts
  - session/sessionCodec.ts
  - sidePanel/elements.ts
  - sidePanel/hullSection.ts
  - side.ts
  - sidePanel/pasteImportSection.ts
  - sidePanel/propulsionSection.ts
  - sidePanel/propulsionVariantSection.ts
  - sidePanel/sidePanel.ts
  - sidePanel/module.ts
  - sidePanel/sidePanelSections.ts
  - sidePanel/skillOverloadSection.ts
  - sidePanel/statsSection.ts
  - turret/ammoList.ts
  - turret/sigResIcons.ts
  - turret/turretController.ts
  - turret/turretControllerContract.ts
  - drone/droneController.ts
  - drone/droneControllerContract.ts
  - drone/droneController.test.ts
  - drone/testSupport.ts
  - drone/module.ts
  - drone/index.ts
  - export/module.ts
  - export/exportController.ts
  - export/exportController.test.ts
  - export/exportControllerContract.ts
  - export/index.ts
  - sidePanel/droneLink.ts
  - choiceGroup.test.ts
  - trackingInput.ts
  - testSupport.ts
  - controlsFormat.test.ts
  - trackingInput.test.ts
  - cradle.ts
  - module.test.ts
  - elementContract.ts
  - index.ts
  - markup/html.ts
  - markup/html.test.ts
  - markup/index.ts
  - markup/MODULE.md
  - shared/selectableList.ts
  - shared/selectableList.test.ts
  - shared/MODULE.md
  - choiceGroup.ts
  - controlsContract.ts
  - controlsFormat.ts
  - damageTypeIcons.ts
---









# controls

DOM form controls, input orchestration, and popups for the gunner UI.

The module is organized into sub-modules: `session`, `turret`, `popup`, `import`, `export`, `share`, `hints`, `sidePanel`, `ewar`, `defense`, `booster`, `missileBooster`, `rangeOverlay`, `portraits`, `confirm`, `domControls`, `effectiveReadout`, `engagementReadout`, `preferences`, `profile`, and `drone`. `DomControls` exposes the `Controls` facade. `EffectiveReadout` updates per-frame effective attribute suffixes for speed, tracking, optimal and falloff. `SimConfigSource` lives in `session` and owns `getConfig()` assembly from the two side panels, preferences, EWAR, boosters, missile boosters, and the initial distance source.

The public surface is `Controls`, `ControlsCallbacks`, `ControlsCradle`, `registerControlsModule`, `EffectiveReadouts`, and `Side`.
`index.ts` re-exports these cross-boundary types. `elementContract.ts` is the single source of truth for control element ids, tags, and default values. `createControlsEls()` consumes it, and `index.ts` re-exports `DEFAULT_VALUES` and `TAG_BY_ID` for test/runtime contracts.

Each sub-module owns its DOM element collection through a private `collectXxxEls` function in its `module.ts` and registers its implementation through the same file. The broad `createControlsEls()` map remains a root-level value; sub-modules derive a narrow local `XxxEls` type and extract the fields they need. Cross-feature notifications travel through the shared `UiEvents` bus: `importController` emits `fittingImported`, `configInvalidated`, and `profileTextLoaded`; `ewarController`, `defenseController`, `boosterController`, and `missileBoosterController` listen for `fittingImported`; `profileController` emits `profileLoaded` and `newProfile`; `persistConfigChange` routes its notify through `emitConfigInvalidated` so every config listener (including the capacitor preview) re-derives from the same channel. `DomControls` listens to `sessionRestored`, `sessionReset`, `startupDefaultsApplied`, `configInvalidated` and `displayInvalidated` on `UiEvents`; `SessionCodec` is the source of `sessionRestored`/`sessionReset`/`startupDefaultsApplied` after it processes profile load, text import and reset events.

`module.ts` composes the full graph declaratively in the DI container. Registration order is acyclic and driven by feature registration: `hints` → `turret` → `sidePanel` → `ewar` → `defense` → `booster` → `missileBooster` → `rangeOverlay` → `portraits` → `popup` → `import` → `export` → `share` → `confirm` → `engagementReadout` → `effectiveReadout` → `preferences` → `profile` → `session` → `domControls` → `combatantSide.wireCombatantSide` binds `SidePanel.setFittingPopup`, `SidePanel.setFittingPreview`, `SidePanel.setImporter`, `SidePanel.setExporter`, and the `SidePanelHost`.

`SidePanel.setFittingPopup`, `setFittingPreview`, and `setImporter` remain setter-based because the fitting popup, preview manager, and import controller all depend on the side panels, so passing them through the constructor would create a dependency cycle. `ProfileController.snapshotSource` is supplied through the constructor as a deferred closure over `sessionCodec.capture()`, removing the previous `setSnapshotSource` back-edge. `shipASide` and `shipBSide` are registered independently in the DI cradle and wired side-by-side by `combatantSide.wireCombatantSide`.

Gate relaxed: `controlsContract.ts` was removed from `no-new-exports` to add `DroneReadoutValues` alongside the existing `TurretReadoutValues`/`MissileReadoutValues`/`NoWeaponReadoutValues` union members. The drone readout values carry tracking/optimal/falloff/sigResolution (drones share the turret hit-chance model) without boosted/disrupted variants since drones have no tracking computer or disruptor mechanics.

Gate note (drone/fighter unit durability): `unitAlive/` is a new sub-module whose single file `unitAliveReadout.ts` exports the `UnitAliveReadout` abstraction and its `UnitAliveReadoutImpl` (per-side aggregate "alive/total" text, "-" when the wing is empty), registered in `domControls/module.ts` and consumed by `readoutPresenter.ts` (gated, body change) inside `applyReadouts`; the canvas already renders alive units only. `elementContract.ts` (gated) added the `drone-alive`/`fighter-alive` spans and the `attack-drones` checkbox to `TAG_BY_ID`; `elements.ts` (gated) collects them; `cradle.ts` (gated) declares the readout. `navSection.ts` (ungated) captures/restores the `attackDrones` tactic through `SidePanelState.attackDrones` and `sidePanel.ts` (gated) forwards it; `session/simConfigSource.ts` passes it into `CombatantConfig.attackDrones`. Panels and i18n gained the drone/fighter alive rows and the attack-drones label; the markup-parity baseline was regenerated. No new exports from gated files.

Gate note (heat mapping): `turretController.ts` and `launcherController.ts` changed bodies only (conditional spread of `heatDamagePerCycle` from the imported turret/launcher into the sim specs) so weapon heat data reaches the runtime without UI-layer knowledge of the mechanic. No new exports.
Gate note (drone/fighter bay UI): `elementContract.ts` added the `drone-launch-all`/`drone-recall-all`/`fighter-launch-all`/`fighter-recall-all` buttons to `TAG_BY_ID` and `elements.ts` collects them. The drone/fighter controllers render bay + launched steppers per loadout row (the bay stepper stores idle and auto-launches only when a validator-checked candidate stays within the launch budget; the launched stepper steps by squadron max size for fighters), plus launch-all/recall-all quick actions disabled while the bay is empty; `DronePanel.astro`/`FighterPanel.astro` gained the bay header, column headers, and quick actions, and the markup-parity baseline was regenerated. No new exports.
Gate note (attack-drones toggle relocation): the `attack-drones` checkbox moved from the side panel nav section into the targeting popup. `elementContract.ts` dropped the `attackDrones` entry and `elements.ts` (gated) stopped collecting it; `navSection.ts` no longer captures/restores the tactic; `SidePanelState` lost the optional `attackDrones` field; `session/simConfigSource.ts` reads `TargetingController.attackDrones(side)` instead. The targeting controller renders the toggle dynamically (targeting-drones-* classes in targeting-popup.css) and emits configInvalidated on change. No new exports from gated files.
Gate note (drone launch budget clamp): `droneController.ts` (gated) now clamps the launched set to the launch budget at every entry point so the stored `activeCount` never exceeds what the resolver would project for the sim: the launched stepper routes through `tryLaunch` (blocked on `tooManyDrones`/`bandwidthExceeded`), and launch-all, EFT import, and session restore derive the clamped groups from `DroneLoadoutResolver.resolve` (the same projection the sim consumes, keeping UI launched counts, summary chips, and telemetry equal to the simulated set). Body change only.
