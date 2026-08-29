---
no-new-exports:
  - choiceGroup.ts
  - combatantSide.ts
  - controlsDom.ts
  - domControls/domControls.ts
  - domControls/domControlsContract.ts
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
  - choiceGroup.test.ts
  - controlsFormat.ts
  - trackingInput.ts
  - controlsContract.ts
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
  - shared/index.ts
  - shared/MODULE.md
---







# controls

DOM form controls, input orchestration, and popups for the gunner UI.

The module is organized into sub-modules: `session`, `turret`, `popup`, `import`, `share`, `hints`, `sidePanel`, `ewar`, `booster`, `rangeOverlay`, `portraits`, `confirm`, `domControls`, `effectiveReadout`, `engagementReadout`, `preferences`, and `profile`. `DomControls` exposes the `Controls` facade. `EffectiveReadout` updates per-frame effective attribute suffixes for speed, tracking, optimal and falloff. `SimConfigSource` lives in `session` and owns `getConfig()` assembly from the two side panels, preferences, EWAR, boosters, and the initial distance source.

The public surface is `Controls`, `ControlsCallbacks`, `ControlsCradle`, `registerControlsModule`, `EffectiveReadouts` (used by `Controls.update`), and `Side`.
`index.ts` re-exports these cross-boundary types. `elementContract.ts` is the single source of truth for control element ids, tags, and default values. `createControlsEls()` consumes it, and `index.ts` re-exports `DEFAULT_VALUES` and `TAG_BY_ID` for test/runtime contracts.

Each sub-module owns its DOM element collection through a private `collectXxxEls` function in its `module.ts` and registers its implementation through the same file. The broad `createControlsEls()` map remains a root-level value; sub-modules derive a narrow local `XxxEls` type and extract the fields they need. Cross-feature notifications travel through the shared `UiEvents` bus: `importController` emits `fittingImported`, `configInvalidated`, and `profileTextLoaded`; `ewarController` and `boosterController` listen for `fittingImported`; `profileController` emits `profileLoaded` and `newProfile`. `DomControls` listens to `sessionRestored`, `sessionReset`, `startupDefaultsApplied`, `configInvalidated` and `displayInvalidated` on `UiEvents`; `SessionCodec` is the source of `sessionRestored`/`sessionReset`/`startupDefaultsApplied` after it processes profile load, text import and reset events.

`module.ts` composes the full graph declaratively in the DI container. Registration order is acyclic and driven by feature registration: `hints` → `turret` → `sidePanel` → `ewar` → `booster` → `rangeOverlay` → `portraits` → `popup` → `import` → `share` → `confirm` → `engagementReadout` → `effectiveReadout` → `preferences` → `profile` → `session` → `domControls` → `combatantSide.wireCombatantSide` binds `SidePanel.setFittingPopup`, `SidePanel.setFittingPreview`, `SidePanel.setImporter`, and the `SidePanelHost`.

`SidePanel.setFittingPopup`, `setFittingPreview`, and `setImporter` remain setter-based because the fitting popup, preview manager, and import controller all depend on the side panels, so passing them through the constructor would create a dependency cycle. `ProfileController.snapshotSource` is supplied through the constructor as a deferred closure over `sessionCodec.capture()`, removing the previous `setSnapshotSource` back-edge. `shipASide` and `shipBSide` are registered independently in the DI cradle and wired side-by-side by `combatantSide.wireCombatantSide`.
