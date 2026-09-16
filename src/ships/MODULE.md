---
no-new-exports:
  - effectiveStats.test.ts
  - cradle.ts
  - effectiveStats.ts
  - fitting.test.ts
  - fitting.ts
  - module.ts
  - propulsion.test.ts
  - ships.test.ts
  - tiers.test.ts
  - tiers.ts
  - ships.ts
---


# ships

Ship propulsion fitting math and effective-stat calculations. The `Ships` abstraction in `ships.ts` owns lookup, localization read models, propulsion validation, fitting eligibility, effective-stat calculations, the speed-from-active-mass calculation, and the EVE align-time calculation. `ShipsImpl` is registered through `module.ts` as a singleton in the Awilix DI container, and the cross-module public surface is `index.ts`. Ship profile data and localized names are consumed from the `gamedata` module through `ShipProfileCatalog` and `NameI18nCatalog`. `ShipProfile` in `types.ts` carries all numeric fields (mass, navigation, defense, capacitor, targeting, drones, slots) sourced from the SDE snapshot (type records and typedogma) via `scripts/generate-ship-profiles.ts`; `types.ts` has a type-only import of `DamageResists` from `../sim` (no runtime cycle — `sim` does not import from `ships`). `DefenseSkills` and `defaultDefenseSkills` in `types.ts` model the per-skill defensive skill levels (Shield Management, Shield Operation, Hull Upgrades, Mechanics, four Shield + four Armor Compensation skills, Armor Resistance Phasing, Tactical Shield Manipulation, Thermodynamics) consumed by `fitting/defenseCalculator.ts`; `StatConditions.defenseSkills` is optional — when absent, the defense calculator falls back to `defaultDefenseSkills(skillLevel)`.

Gate relaxed: `types.ts`, `propulsion.ts`, and `index.ts` were removed from `no-new-exports` to add `CapacitorSkills`, `defaultCapacitorSkills`, `StatConditions.capacitorSkills`, and `PropulsionStats.capacitorCapacityMultiplier` for the capacitor system: `CapacitorSkills` parallels `DefenseSkills` (Energy Management +5% capacity/level, Energy Systems Operations −5% recharge time/level) and is consumed by `fitting/capacitorCalculator.ts` via the optional `capacitorSkills` condition; `capacitorCapacityMultiplier` carries the MWD capacitor-capacity penalty (SDE attr 147, e.g. 0.75) from the generated fitting database through the propulsion projection into the calculator.
