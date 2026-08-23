---
no-new-exports:
  - side.ts
  - sidePanel.ts
  - popup.ts
  - elements.ts
  - hullSection.ts
  - pasteImportSection.ts
  - propulsionSection.ts
  - propulsionVariantSection.ts
  - skillOverloadSection.ts
  - statsSection.ts
  - sidePanelSections.ts
  - sidePanel.test.ts
  - skillOverloadSection.test.ts
  - pasteImportSection.test.ts
  - propulsionSection.test.ts
  - module.ts
  - hullSection.test.ts
  - sidePanelContract.ts
  - statsSection.test.ts
  - index.ts
  - turretLink.ts
  - overrides.ts
---



# sidePanel

Side-by-side ship fitting and stat inputs for the attacker and target.

The `SidePanel` interface is the public abstraction. `SidePanelDeps`, `SidePanelHost`, `SidePanelState`, and `SidePanelElements` are shared DTOs exposed as types. Implementation classes remain internal and are wired through `module.ts` via DI. Generic `Popup` and `PopupGroup` abstractions also live here because the popup sub-module depends on side-panel types.
