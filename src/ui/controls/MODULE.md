---
no-new-exports:
  - choiceGroup.ts
  - controlsContract.ts
  - controlsDom.ts
  - controlsFormat.ts
  - domControls.ts
  - domControlsContract.ts
  - elements.ts
  - elementsContract.ts
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
  - session/eventRouter.ts
  - session/hullDatalist.ts
  - session/module.ts
  - session/sessionCodec.ts
  - sidePanel/elements.ts
  - sidePanel/hullSection.ts
  - sidePanel/popup.ts
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
  - engagementReadout.test.ts
  - trackingInput.test.ts
  - domControls.test.ts
  - cradle.ts
  - index.ts
  - profileController.test.ts
  - module.test.ts
  - ewar/ewarController.ts
  - ewar/ewarController.test.ts
  - ewar/ewarControllerContract.ts
  - ewar/index.ts
  - ewar/module.ts
  - ewar/MODULE.md
  - elementCollectors.ts
---





# controls

DOM form controls, input orchestration, and popups for the gunner UI.

The module is organized into sub-modules: `session`, `turret`, `popup`, `import`, `share`, `hints`, `sidePanel`, and `ewar`. `DomControls` exposes the `Controls` facade. The public surface is `Controls`, `ControlsCallbacks`, `ControlsCradle`, and `registerControlsModule`. Each sub-module owns its implementation and registers it through its own `module.ts`; the root `module.ts` composes the full graph declaratively in the DI container.

Construction order in `module.ts` is acyclic and registration-driven: value leaves (`els`, `popupGroup`, `hullDatalist`, `hintRotator`, `readout`, `sigResChoice`, `trackingInput`) → `turretController` (with its own `TurretOverrides` singleton) → `attackerSide`/`targetSide` → `preferencesController`/`profileController` → `sessionCodec` → `importController`/`shareController` → setter-injected reverse edges (`SidePanel.setFittingPopup`, `SidePanel.setFittingPreview`, `SidePanel.setImporter`, `ProfileController.setSnapshotSource`, `EventRouter.setHost`) → `previewManager`/`fittingPopup` → `eventRouter`.
