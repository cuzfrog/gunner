---
no-new-exports:
  - hullDatalist.ts
  - sessionCodec.ts
  - sessionControl.ts
  - sessionCodec.test.ts
  - module.ts
  - startupDefaults.ts
  - module.test.ts
  - simConfigSource.ts
---




# session

Session state, URL encoding, and hull datalist.

The public surface is the abstraction types: `SessionCodec`, `SessionControl`, `HullDatalist`, and `SimConfigSource`. The module owns its DOM collection through a private `collectSessionCodecEls`; `HullDatalist` now receives only the `hullOptions` element it needs.
