---
no-new-exports:
  - side.ts
  - sidePanel.ts
  - sidePanelContract.ts
  - sidePanelFactory.ts
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

The `SidePanel` interface is the public abstraction; `createSidePanel` is the module's composition factory. `collectSideEls` is the only element collector exposed. Implementation classes and `SidePanelElements` remain internal to the sub-module. Generic `Popup` and `PopupGroup` abstractions also live here because the popup sub-module depends on side-panel types.
