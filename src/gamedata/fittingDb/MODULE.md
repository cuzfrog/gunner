---
no-new-exports:
  - fittingDb.test.ts
  - catalog.ts
---




# fittingDb

Fitting database generated from EVE Online SDE via Pyfa staticdata. The public surface is `FittingDbData` (and alias `FittingDb`) and `FITTING_DB` (exported from `index.ts`). Type definitions live in `types.ts` (tracked). Data tables live in `generated/fittingDb.data.ts` (gitignored, produced by `scripts/generate-fitting-db.ts`).

Gate relaxed: `types.ts` was split from the generated `fittingDb.ts` to separate the tracked type contract from the gitignored generated data. `catalog.ts` imports types from `./types` and data from `./generated/fittingDb.data`, assembling the `FITTING_DB` aggregate. `index.ts` re-exports both types and data tables for backward-compatible consumption. The defense stat-type family (`DefenseModuleStats`, `DefenseLayer`, `DefenseRepairerOverload`, `DefenseAncillary`) uses `DamageResists` imported from `sim` for all resist fields, ensuring a single shared resist type across the codebase. `index.ts` was removed from `no-new-exports` to re-export `PropulsionBonusAttribute`, `TurretBonusAttribute`, `MissileBonusAttribute`, `DroneBonusAttribute`, and `DefenseBonusAttribute` as pipeline-specific subsets of `HullBonusAttribute`, enabling compile-time exhaustive handler tables in each consumer pipeline.

Gate note (capacitor attributes): the classification scaffolds classify semantic attrs 6/73 as `capUse`/`duration` (context-dependent; previously out-of-scope, which silently omitted every capacitor skill/hull modifier). `types.ts` (tracked) gained `ModuleBonusAttribute` (unioned into `HullBonusAttribute` and `SkillBonusType`), `ChargeStats.capacitorNeedMultiplier` (attr 317, e.g. Conflagration), `FittingPropulsionStats.cycleTime` + `requiredSkillIds`, `requiredSkillIds` on the nine cap-consuming families, and `WarpScramblerStats.propulsionBlock` (attr 1350 > 0) — so the generated db now includes long-range warp disruptors in `warpScramblers` as non-blocking rows. The db was regenerated; bundle-size baseline in `scripts/build.test.ts` tracks the growth.
