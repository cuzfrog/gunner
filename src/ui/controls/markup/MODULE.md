---
no-new-exports:
  - html.ts
  - index.ts
---

# markup

Declarative DOM construction helper. The `html` tagged template builds real DOM nodes through `document.createElement` / `createTextNode` / `createDocumentFragment` / `appendChild` / `setAttribute` / `textContent`, never through `innerHTML` parsing. Interpolated text is escaped structurally via `textContent`.

Event listeners are attached after construction by the caller; the helper is a pure builder.
