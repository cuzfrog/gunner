---
no-new-exports:
  - module.ts
  - exportController.ts
  - exportController.test.ts
  - exportControllerContract.ts
  - index.ts
---

# export

Copy the imported EFT fitting text of a side panel to the clipboard.

The public surface is `ExportController`. Side panels hold it through `setExporter` and trigger `copyFitting` on the copy button click; the wiring in `controls/module.ts` binds each side panel to the shared controller. The controller consumes a narrow `FittingExportSource` (the panel's `fittingText` and paste hint area) instead of the full `SidePanel`. It copies `SidePanel.fittingText` verbatim, which is the canonical EFT of the last import or selection; UI-side changes such as ammo, variants, or drone loadouts are session-local overrides and are intentionally not exported. Feedback reuses the paste import hint area with `status.copied` and `status.failed`.
