---
no-new-exports:
  - cradle.ts
  - module.ts
  - index.ts
---


# gamedata

Generated EVE Online game data exposed as typed DI-accessor modules. Each sub-module owns one dataset and exposes an interface registered through its own `module.ts`; `registerGameDataModule` composes all sub-modules.
