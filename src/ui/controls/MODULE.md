---
no-new-exports:
  - choiceGroup.ts
  - combatantSide.ts
  - controlsDom.ts
  - domControls.ts
  - domControlsContract.ts
  - effectiveReadout.ts
  - elements.ts
  - engagementReadout.ts
  - hints/hintRotator.ts
  - hints/module.ts
  - import/attackerTurret.ts
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
  - preferencesController.ts
  - profileController.ts
  - session/hullDatalist.ts
  - session/module.ts
  - session/sessionCodec.ts
  - sidePanel/elements.ts
  - sidePanel/hullSection.ts
  - side.ts
  - sidePanel/pasteImportSection.ts
  - sidePanel/propulsionSection.ts
  - sidePanel/propulsionVariantSection.ts
  - sidePanel/side.ts
  - sidePanel/sidePanel.ts
  - sidePanel/module.ts
  - sidePanel/sidePanelSections.ts
  - sidePanel/skillOverloadSection.ts
  - sidePanel/statsSection.ts
  - turret/ammoList.ts
  - turret/sigResButtons.ts
  - turret/sigResIcons.ts
  - turret/turretController.ts
  - turret/turretControllerContract.ts
  - turret/turretEls.ts
  - turret/module.ts
  - turret/turretInputSet.ts
  - turret/turretStateResolver.ts
  - turret/testSupport.ts
  - choiceGroup.test.ts
  - trackingInput.ts
  - preferencesController.test.ts
  - testSupport.ts
  - controlsFormat.test.ts
  - effectiveReadout.test.ts
  - engagementReadout.test.ts
  - trackingInput.test.ts
  - domControls.test.ts
  - cradle.ts
  # index.ts re-exports cross-boundary controls DTOs and is intentionally open for additions.
  # - index.ts
  - profileController.test.ts
  - module.test.ts
  - ewar/ewarController.ts
  - ewar/ewarController.test.ts
  - ewar/ewarControllerContract.ts
  - ewar/module.ts
  - ewar/MODULE.md
  - booster/MODULE.md
  - booster/boosterController.ts
  - booster/boosterController.test.ts
  - booster/boosterControllerContract.ts
  - booster/index.ts
  - booster/module.ts
  - rangeOverlay/MODULE.md
  - rangeOverlay/rangeOverlayController.ts
  - rangeOverlay/rangeOverlayController.test.ts
  - rangeOverlay/rangeOverlayControllerContract.ts
  - rangeOverlay/index.ts
  - rangeOverlay/module.ts
  - confirmController.test.ts
  - confirmController.ts
  - profileChangeTracker.test.ts
  - profileChangeTracker.ts
---






# controls

DOM form controls, input orchestration, and popups for the gunner UI.

The module is organized into sub-modules: `session`, `turret`, `popup`, `import`, `share`, `hints`, `sidePanel`, `ewar`, `booster`, and `rangeOverlay`. `DomControls` exposes the `Controls` facade and implements `SessionControl` for `SessionCodec`. `EffectiveReadout` updates per-frame effective attribute suffixes for speed, tracking, optimal and falloff. `SimConfigSource` lives in `session` and owns `getConfig()` assembly from the two side panels, preferences, EWAR, boosters, and the initial distance source. The public surface is `Controls`, `ControlsCallbacks`, `ControlsCradle`, `registerControlsModule`, `EffectiveReadouts` (used by `Controls.update`), and `Side`; `index.ts` re-exports these cross-boundary types.

Each sub-module owns its DOM element collection through a private `collectXxxEls` function in its `module.ts` and registers its implementation through the same file. The broad `createControlsEls()` map remains a root-level value; sub-modules derive a narrow local `XxxEls` type and extract the fields they need. Cross-feature notifications travel through the shared `UiEvents` bus: `importController` emits `fittingImported`, `configInvalidated`, and `profileTextLoaded`; `ewarController` and `boosterController` listen for `fittingImported`; `profileController` emits `profileLoaded` and `newProfile`; `DomControls` subscribes to these channels and to `configInvalidated`/`displayInvalidated`.

`module.ts` composes the full graph declaratively in the DI container. Registration order is acyclic and driven by feature registration: `hints` → `turret` → `sidePanel` → `ewar` → `booster` → `rangeOverlay` → `popup` → `import` → `share` → `session` → root readouts, preferences, profile, confirmations, and `DomControls` → `combatantSide.wireCombatantSide` binds `SidePanel.setFittingPopup`, `SidePanel.setFittingPreview`, `SidePanel.setImporter`, and the `SidePanelHost`.

`SidePanel.setFittingPopup`, `setFittingPreview`, and `setImporter` remain setter-based because the fitting popup, preview manager, and import controller all depend on the side panels, so passing them through the constructor would create a dependency cycle. `ProfileController.snapshotSource` is supplied through the constructor as a deferred closure over `sessionCodec.capture()`, removing the previous `setSnapshotSource` back-edge. The deleted `elementsContract.ts` and `elementCollectors.ts` are no longer part of the module surface.
