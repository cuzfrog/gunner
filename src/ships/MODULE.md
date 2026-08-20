---
no-new-exports:
  - effectiveStats.test.ts
  - effectiveStats.ts
  - fitting.test.ts
  - fitting.ts
  - fittedMass.test.ts
  - fittedMass.ts
  - faction-i18n.ts
  - hull-types-i18n.ts
  - index.ts  # Controlled public boundary: re-exports the Ships abstraction, types, and module registration only
  - module.ts
  - profiles.ts
  - propulsion.test.ts
  - propulsion.ts
  - ship-names-i18n.ts
  - shipNames.ts
  - ships.test.ts
  - ships.ts
  - tiers.test.ts
  - tiers.ts
  - types.ts
---



# ships

Static ship profile data and propulsion fitting math. The `Ships` abstraction in `ships.ts` owns lookup, localization read models, propulsion validation, fitting eligibility, effective-stat calculations, and the speed-from-active-mass calculation. `ShipsImpl` is registered through `module.ts` as a singleton in the Awilix DI container, and the cross-module public surface is `index.ts`. Generated `profiles.ts` holds parsed EVE hull statistics; `ship-names-i18n.ts`, `hull-types-i18n.ts`, and `faction-i18n.ts` provide Chinese (Simplified) and Japanese localized ship, hull type, and faction names sourced from the CCP SDE localization data.
