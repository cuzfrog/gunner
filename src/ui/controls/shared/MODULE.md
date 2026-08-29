---
no-new-exports:
  - selectableList.ts
  - index.ts
---

# shared

Shared dynamic DOM renderers used across multiple control sub-modules. Each renderer is a stateless class instantiated by controllers with a shape config. Renderers build DOM through the `markup` `html` helper, never through `innerHTML`.
