---
no-new-exports:
  - choiceGroup.ts
  - controlsContract.ts
  - controlsDom.ts
  - controlsFormat.ts
  - domControls.ts
  - domControlsContract.ts
  - domControlsFactory.ts
  - elements.ts
  - elementsContract.ts
  - engagementReadout.ts
  - fakeDocument.ts
  - fakeElement.ts
  - hints/hintMessages.ts
  - hints/hintRotator.ts
  - hints/hints.ts
  - hints/loreMessages.ts
  - import/attackerTurret.ts
  - import/eftSideImporter.ts
  - import/importController.testSupport.ts
  - import/importController.ts
  - import/importControllerContract.ts
  - import/profileTextImporter.ts
  - mockFactories.ts
  - module.ts
  - popup/fittingPopupController.ts
  - popup/fittingPopupEls.ts
  - popup/fittingPopupRenderer.ts
  - popup/fittingPreview.ts
  - popup/fittingPreviewManager.ts
  - popup/popupGroup.ts
  - preferencesController.ts
  - profileController.ts
  - session/eventRouter.ts
  - session/hullDatalist.ts
  - session/languageRefresh.ts
  - session/sessionCodec.ts
  - sidePanel/elements.ts
  - sidePanel/hullSection.ts
  - sidePanel/popup.ts
  - sidePanel/pasteImportSection.ts
  - sidePanel/propulsionSection.ts
  - sidePanel/propulsionVariantSection.ts
  - sidePanel/side.ts
  - sidePanel/sidePanel.ts
  - sidePanel/sidePanelContract.ts
  - sidePanel/sidePanelFactory.ts
  - sidePanel/sidePanelSections.ts
  - sidePanel/skillOverloadSection.ts
  - sidePanel/statsSection.ts
  - sidePanelHostBuilder.ts
  - testConstants.ts
  - testSupport.ts
  - trackingInput.ts
  - turret/ammoList.ts
  - turret/sigResButtons.ts
  - turret/sigResIcons.ts
  - turret/turretController.ts
  - turret/turretControllerContract.ts
  - turret/turretEls.ts
  - turret/turretInputSet.ts
  - turret/turretStateResolver.ts
---

# controls

DOM form controls, input orchestration, and popups for the gunner UI.

The module is organized into sub-modules: `session`, `turret`, `popup`, `import`, `hints`, and the existing `sidePanel`. `DomControls` collects element slices, constructs the controller graph, and exposes the `Controls` facade. The public surface remains `Controls`, `ControlsCallbacks`, and `registerControlsModule`. Implementation classes are registered via `module.ts`, and `domControlsFactory.ts` is the composition root allowed to construct from deep sub-module paths.
