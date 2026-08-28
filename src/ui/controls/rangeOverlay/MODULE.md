---
no-new-exports:
  - rangeOverlayController.ts
  - rangeOverlayController.test.ts
  - rangeOverlayControllerContract.ts
  - module.ts
  - index.ts
---

# rangeOverlay

Canvas range overlay legend and controller. `RangeOverlayController` computes EWAR projection radii and provides the per-kind visibility toggle UI. The public surface is `RangeOverlayController`; `registerRangeOverlayModule` is exported for DI registration. The module owns its DOM collection through a private `collectRangeOverlayEls`.
