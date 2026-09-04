---
no-new-exports:
  - selectionSession.ts
  - selectionSession.test.ts
  - dimensionKeyer.ts
  - dimensionedSelection.ts
  - dimensionedSelection.test.ts
  - turretDimensionKeyer.ts
  - turretDimensionKeyer.test.ts
  - launcherDimensionKeyer.ts
  - launcherDimensionKeyer.test.ts
  - propulsionDimensionKeyer.ts
  - propulsionDimensionKeyer.test.ts
  - module.ts
  - index.ts
---

# selectionSession

Generic per-side in-memory store for last-selected module variants. Decouples
"remember what the user picked" from weapon/propulsion controllers.

`SelectionSession` is a string-keyed map with no domain knowledge.
`DimensionKeyer<D>` knows how to produce a string key and a fallback
`StoredSelection` for a given dimension. `DimensionedSelection<D>` is the only
public path to resolve a variant for a dimension: `selectionFor` recalls from
the session or falls back; `noteApplied` records the applied selection.

Domain keyers (`TurretDimensionKeyerImpl`, `LauncherDimensionKeyerImpl`,
`PropulsionDimensionKeyerImpl`) are the single place that knows keying and
fallback for each selectable system. New selectable systems add a keyer and use
`DimensionedSelection` — they do not grow the store interface.

The propulsion dimension carries `{ kind, module }` because the fallback
(default module id) depends on the runtime `PropulsionModule`, not just the
kind. The key is derived from `kind` only, so memory is keyed per kind while
the fallback uses the module's `defaultModuleId`.
