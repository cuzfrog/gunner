---
no-new-exports:
  - index.ts
---

# scripts/iconAssets

Shared logic for the game icon asset pipeline: SDE icon scope derivation, PNG parsing, and type-icon sync/verify.

Consumers: `scripts/generate-icon-assets.ts` (generated TYPE_ICON_FILES table) and `scripts/sync-type-icons.ts` (fetch/repair/verify CLI). `tests/typeIconsData.test.ts` reuses the validation for the repo data guard.
