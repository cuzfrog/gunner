---
no-new-exports:
  - effectiveStats.test.ts
  # - effectiveStats.ts  # shared stat engine exposes fittedStats/maxSpeedForFittedMass/alignTime
  - fitting.test.ts
  - fitting.ts
  - faction-i18n.ts
  - hull-types-i18n.ts
  # - index.ts  # controlled public boundary re-exports cross-boundary FittedHull/PropulsionStats/PropulsionKind types
  # - module.ts
  - profiles.ts
  - propulsion.test.ts
  - propulsion.ts
  - ship-names-i18n.ts
  - shipNames.ts
  - ships.test.ts
  # - ships.ts  # Ships interface exposes fittedStats/maxSpeedForFittedMass/alignTime
  - tiers.test.ts
  - tiers.ts
  # - types.ts  # gains FittedHull and PropulsionStats cross-boundary types
---



# ships

Static ship profile data and propulsion fitting math. The `Ships` abstraction in `ships.ts` owns lookup, localization read models, propulsion validation, fitting eligibility, effective-stat calculations, the speed-from-active-mass calculation, and the EVE align-time calculation. `ShipsImpl` is registered through `module.ts` as a singleton in the Awilix DI container, and the cross-module public surface is `index.ts`. Generated `profiles.ts` holds parsed EVE hull statistics; `ship-names-i18n.ts`, `hull-types-i18n.ts`, and `faction-i18n.ts` provide Chinese (Simplified) and Japanese localized ship, hull type, and faction names sourced from the CCP SDE localization data.
