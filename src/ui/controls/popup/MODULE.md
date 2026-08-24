---
no-new-exports:
  - fittingPopupController.ts
  - fittingPopupEls.ts
  - fittingPopupHost.ts
  - fittingPopupRenderer.ts
  - fittingPreview.ts
  - fittingPreviewManager.ts
  - popupGroup.ts
  - module.ts
  - fittingPreview.test.ts
  - fittingPopupController.test.ts
  - index.ts
  - popupGroup.test.ts
  - fittingPreviewManager.test.ts
  - module.test.ts
---



# popup

Popup groups, fitting popups, and fitting previews.

`Popup` and `PopupGroup` abstractions live here and are the generic popup surface. The `sidePanel/popup.ts` file re-exports them so existing `sidePanel` consumers keep their import paths. Fitting popup and preview rendering consume a narrow `FittingPopupHost` instead of the full `SidePanel` contract. The public surface is `Popup`, `PopupGroup`, `FittingPopupController`, and `FittingPreviewManager`.
