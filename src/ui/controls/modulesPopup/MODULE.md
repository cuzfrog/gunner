---
no-new-exports:
  - modulesPopupControllerContract.ts
  - modulesPopupController.ts
  - module.ts
  - index.ts
---

# modulesPopup

Owns the shared "Modules" popup shell (trigger + popup container) that hosts sections from ewar, booster, missileBooster, and sensorBooster controllers. The trigger enablement is derived from DOM occupancy: any visible `.preview-section` child with content enables the trigger. A `MutationObserver` keeps enablement in sync when sections are added, removed, or hidden. Controllers that need to close child popups when the shell closes register via `registerOnClose`.
