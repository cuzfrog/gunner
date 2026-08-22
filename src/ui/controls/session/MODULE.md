---
no-new-exports:
  - eventRouter.ts
  - hullDatalist.ts
  - languageRefresh.ts
  - sessionCodec.ts
---

# session

Session state, URL encoding, event routing, language refresh, and hull datalist.

The public surface is the abstraction types: `SessionCodec`, `EventRouter`, `EventRouterHost`, `LanguageRefresh`, and `HullDatalist`.

`EventRouter` dispatches input events to the `turret`, `popup`, `sidePanel`, `hints`, and `import` sub-modules, so the sub-module may depend on their public indexes.
