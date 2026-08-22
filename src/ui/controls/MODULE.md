---
no-new-exports:
  - domControls.ts
  - domControlsFactory.ts
  - module.ts
---

# controls

DOM form controls, input orchestration, and popups for the gunner UI.

`DomControls` collects element slices, constructs the controller graph, and exposes the `Controls` facade used by the app loop. The public surface of the module is `Controls`, `ControlsCallbacks`, and `registerControlsModule`. Implementation classes are registered via `module.ts`.
