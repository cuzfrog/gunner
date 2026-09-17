no-new-exports:
  - statHintRenderer.ts
  - statHintRenderer.test.ts
  - module.ts
  - index.ts
---


# statHint

Generic hover hint content renderer for entity statistics. Renders a
`StatHintModel`: optional name/subtitle header, sections of label/value rows
(sections without a heading render as a divided group), rows with optional
damage-type icon and emphasis, and an optional resist table. The visual
pattern is shared by the ship portrait hint, the ammo hint, and the drone
catalog hint; each domain keeps its own `HintContentProvider` and builds a
`StatHintModel` from its own data.

The renderer is registered as `statHintRenderer` in the controls cradle and
injected into the providers; it holds no domain logic and no i18n (labels
arrive resolved in the model).
