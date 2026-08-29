---
no-new-exports:
  - selectableList.ts
  - iconAction.ts
  - summaryChip.ts
  - sectionBlock.ts
  - createPopup.ts
  - spriteIcon.ts
  - createPopup.test.ts
  - iconAction.test.ts
  - index.ts
  - sectionBlock.test.ts
  - selectableList.test.ts
  - spriteIcon.test.ts
  - summaryChip.test.ts
---


# shared

Shared dynamic DOM renderers used across multiple control sub-modules. Each renderer is a stateless class instantiated by controllers with a shape config. Renderers build DOM through the `markup` `html` helper, never through `innerHTML`.

Exception: `iconAction.ts` uses `innerHTML` for opaque SVG icon payloads, as permitted by the markup module for raw SVG. `spriteIcon.ts` generates SVG strings for use with `iconAction.ts`.
