---
no-new-exports:
  - selectableList.ts
  - iconAction.ts
  - summaryChip.ts
  - sectionBlock.ts
  - createPopup.ts
  - spriteIcon.ts
  - variantSection.ts
  - popupField.ts
  - scriptSection.ts
  - createPopup.test.ts
  - iconAction.test.ts
  - sectionBlock.test.ts
  - selectableList.test.ts
  - spriteIcon.test.ts
  - summaryChip.test.ts
  - index.ts
  - variantSection.test.ts
  - popupField.test.ts
  - scriptSection.test.ts
---



# shared

Shared dynamic DOM renderers used across multiple control sub-modules. Each renderer is a stateless class instantiated by controllers with a shape config. Renderers build DOM through the `markup` `html` helper, never through `innerHTML`.

`variantSection.ts` adds `VariantSection`, a stateful controller component that manages a gear-button popup for selecting between module variants (propulsion, launcher, turret). It wraps `SelectableListImpl` for rendering and creates a `Popup` for `PopupGroup` registration. Each caller supplies a variant provider, current-id provider, select handler, and enabled-state provider via `VariantSectionConfig`.

`popupField.ts` adds `PopupField`, a stateful controller component that wraps `createPopup` for the side-panel trigger/summary/section field pattern. It registers the popup with `PopupGroup`, wires the trigger click, and exposes enable/label/close/focus/clearSection helpers. Each caller supplies `PopupFieldEls` (field, trigger, popup, section, summary) and label config.

`scriptSection.ts` adds `ScriptSection`, a stateful controller component that manages a gear-button script selection popup shared across many module rows. It wraps `SelectableListImpl` for rendering and `IconActionImpl` for gear creation, creates a `Popup` registered with `PopupGroup` as a child of a parent popup (so the parent stays open when the script popup opens). Each caller supplies a key type, an options provider, an onSelect callback, a gearHint function, and an optional heading provider. The popup is mounted on a caller-specified host element (typically the modules field, outside any scrolling container) and positioned alongside the parent via a CSS placement class.

Exception: `iconAction.ts` uses `innerHTML` for opaque SVG icon payloads, as permitted by the markup module for raw SVG. `spriteIcon.ts` generates SVG strings for use with `iconAction.ts`.
