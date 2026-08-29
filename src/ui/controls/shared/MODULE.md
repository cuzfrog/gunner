---
no-new-exports:
  - selectableList.ts
  - iconAction.ts
  - summaryChip.ts
  - sectionBlock.ts
  - createPopup.ts
  - spriteIcon.ts
  - variantSection.ts
  - createPopup.test.ts
  - iconAction.test.ts
  - sectionBlock.test.ts
  - selectableList.test.ts
  - spriteIcon.test.ts
  - summaryChip.test.ts
---


# shared

Shared dynamic DOM renderers used across multiple control sub-modules. Each renderer is a stateless class instantiated by controllers with a shape config. Renderers build DOM through the `markup` `html` helper, never through `innerHTML`.

`variantSection.ts` adds `VariantSection`, a stateful controller component that manages a gear-button popup for selecting between module variants (propulsion, launcher, turret). It wraps `SelectableListImpl` for rendering and creates a `Popup` for `PopupGroup` registration. Each caller supplies a variant provider, current-id provider, select handler, and enabled-state provider via `VariantSectionConfig`.

Exception: `iconAction.ts` uses `innerHTML` for opaque SVG icon payloads, as permitted by the markup module for raw SVG. `spriteIcon.ts` generates SVG strings for use with `iconAction.ts`.
