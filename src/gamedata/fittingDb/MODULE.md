---
no-new-exports:
  - fittingDb.test.ts
  - types.ts
  - catalog.ts
---




# fittingDb

Fitting database generated from EVE Online SDE via Pyfa staticdata. The public surface is `FittingDbData` (and alias `FittingDb`) and `FITTING_DB` (exported from `index.ts`). Type definitions live in `types.ts` (tracked). Data tables live in `generated/fittingDb.data.ts` (gitignored, produced by `scripts/generate-fitting-db.ts`).

Gate relaxed: `types.ts` was split from the generated `fittingDb.ts` to separate the tracked type contract from the gitignored generated data. `catalog.ts` imports types from `./types` and data from `./generated/fittingDb.data`, assembling the `FITTING_DB` aggregate. `index.ts` re-exports both types and data tables for backward-compatible consumption. The defense stat-type family (`DefenseModuleStats`, `DefenseLayer`, `DefenseRepairerOverload`, `DefenseAncillary`) uses `DamageResists` imported from `sim` for all resist fields, ensuring a single shared resist type across the codebase. `index.ts` was removed from `no-new-exports` to re-export `PropulsionBonusAttribute`, `TurretBonusAttribute`, `MissileBonusAttribute`, `DroneBonusAttribute`, and `DefenseBonusAttribute` as pipeline-specific subsets of `HullBonusAttribute`, enabling compile-time exhaustive handler tables in each consumer pipeline.
