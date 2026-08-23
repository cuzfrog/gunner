---
no-new-exports:
  - eventRouter.ts
  - hullDatalist.ts
  - sessionCodec.ts
  - sessionControl.ts
  - sessionCodec.test.ts
  - module.ts
  - eventRouter.test.ts
  - index.ts
---


# session

Session state, URL encoding, event routing, and hull datalist.

The public surface is the abstraction types: `SessionCodec`, `SessionControl`, `EventRouter`, `EventRouterHost`, and `HullDatalist`.

`EventRouter` dispatches input events to the `turret`, `popup`, `sidePanel`, `hints`, and `import` sub-modules, so the sub-module may depend on their public indexes.
