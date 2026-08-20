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
  # - index.ts  # Re-exports shipDisplayName, hullTypeDisplayName, factionDisplayName, findShipProfileByName, ShipNameLanguage
  - profiles.ts
  - propulsion.test.ts
  - propulsion.ts
  - ship-names-i18n.ts
  # - shipNames.ts  # Ship name i18n lookup, cross-boundary utility
  - tiers.test.ts
  - tiers.ts
  - types.ts
---



# ships

Static ship profile data and propulsion fitting math. Generated `profiles.ts` holds parsed EVE hull statistics; `ship-names-i18n.ts`, `hull-types-i18n.ts`, and `faction-i18n.ts` provide Chinese (Simplified) and Japanese localized ship, hull type, and faction names sourced from the CCP SDE localization data; the other files expose tier mapping, module catalog, fitting eligibility, and effective mass/speed/signature calculations used by the UI controls.
