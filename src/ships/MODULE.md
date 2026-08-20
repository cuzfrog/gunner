---
no-new-exports:
  - effectiveStats.test.ts
  # - effectiveStats.ts  # shared stat engine gains fittedStats/maxSpeedForFittedMass for the fitting import feature
  - fitting.test.ts
  - fitting.ts
  - fittedMass.test.ts
  - fittedMass.ts
  - faction-i18n.ts
  - hull-types-i18n.ts
  # - index.ts  # controlled public boundary re-exports new cross-boundary FittedHull/PropulsionStats types
  # - module.ts
  - profiles.ts
  - propulsion.test.ts
  - propulsion.ts
  - ship-names-i18n.ts
  - shipNames.ts
  - ships.test.ts
  # - ships.ts  # Ships interface gains fittedStats/maxSpeedForFittedMass
  - tiers.test.ts
  - tiers.ts
  # - types.ts  # gains FittedHull and PropulsionStats cross-boundary types
---



# ships

Static ship profile data and propulsion fitting math. The `Ships` abstraction in `ships.ts` owns lookup, localization read models, propulsion validation, fitting eligibility, effective-stat calculations, and the speed-from-active-mass calculation. `ShipsImpl` is registered through `module.ts` as a singleton in the Awilix DI container, and the cross-module public surface is `index.ts`. Generated `profiles.ts` holds parsed EVE hull statistics; `ship-names-i18n.ts`, `hull-types-i18n.ts`, and `faction-i18n.ts` provide Chinese (Simplified) and Japanese localized ship, hull type, and faction names sourced from the CCP SDE localization data.
