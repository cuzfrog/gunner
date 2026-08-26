---
no-new-exports:
  - hullDatalist.ts
  - sessionCodec.ts
  - sessionCodec.test.ts
  - module.ts
  - startupDefaults.ts
  - module.test.ts
  - simConfigSource.ts
  - simConfigSource.test.ts
  - index.ts
  - hullDatalist.test.ts
---





# session

Session state, URL encoding, and hull datalist.

The public surface is the abstraction types: `SessionCodec`, `HullDatalist`, and `SimConfigSource`. The module owns its DOM collection through a private `collectSessionCodecEls`; `HullDatalist` now receives only the `hullOptions` element it needs. `SessionCodec` subscribes to `UiEvents` profile events (`profileLoaded`, `newProfile`, `profileTextLoaded`) and emits `sessionRestored`, `sessionReset` and `startupDefaultsApplied` after restoring, resetting or applying defaults.
