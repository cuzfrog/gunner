---
no-new-exports:
  - side.ts
  - sidePanel.ts
  - sidePanelContract.ts
  - popup.ts
  - elements.ts
  - hullSection.ts
  - pasteImportSection.ts
  - propulsionSection.ts
  - propulsionVariantSection.ts
  - skillOverloadSection.ts
  - statsSection.ts
  - sidePanelSections.ts
---

# sidePanel

Side-by-side ship fitting and stat inputs for the attacker and target.

The `SidePanel` interface is the public abstraction. `SidePanelDeps`, `SidePanelHost`, `SidePanelState`, and `SidePanelElements` are shared DTOs exposed as types. Implementation classes remain internal and are wired through `module.ts` via DI. Generic `Popup` and `PopupGroup` abstractions also live here because the popup sub-module depends on side-panel types.
