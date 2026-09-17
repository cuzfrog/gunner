---
no-new-exports:
  - shipATurret.ts
  - shipALauncher.ts
  - eftSideImporter.ts
  - importController.testSupport.ts
  - importController.ts
  - importControllerContract.ts
  - profileTextImporter.ts
  - module.ts
  - importController.test.ts
  - index.ts
  - module.test.ts
---




# import

EFT and profile-text fitting import.

The public surface is `ImportController`. The module owns its DOM collection through a private `collectImportEls`. A successful EFT import now publishes `UiEvents.emitFittingImported` and `UiEvents.emitConfigInvalidated`; a profile-text import publishes `UiEvents.emitProfileTextLoaded`, replacing the previous direct setter wiring to `DomControls`. On import and on session restore the weapon system tab auto-selects the system whose skill-adjusted nominal dps is the highest (turrets before missiles before drones on ties); when nothing deals damage the current tab is kept.
