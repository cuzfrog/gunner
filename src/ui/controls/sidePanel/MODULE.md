---
no-new-exports:
  - index.ts
---

# sidePanel

Side-by-side ship fitting and stat inputs for the attacker and target.

The `SidePanel` orchestrator holds side state and exposes the public surface consumed by `domControls`, `SessionCodec`, `ImportController`, and the event router. Single-responsibility section classes own the DOM for the hull, stats, skill/overload, propulsion, and paste-import areas. `collectSideEls` is the only element collector exposed from the module; `SidePanelElements` and the host/state types remain internal to the sub-module.
