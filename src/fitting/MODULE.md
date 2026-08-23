---
sealed:
  - chargeCatalog.test.ts
  - chargeCatalog.ts
  - cradle.ts
  - eft.test.ts
  - eft.ts
  - fittingDb.test.ts
  - fittingDb.ts
  - fittingImport.test.ts
  - fittingImport.ts
  - fittingPresets.ts
  - gunFamilies.test.ts
  - gunFamilies.ts
  - index.ts
  - module.ts
  - moduleSlots.ts
  - presetFittings.test.ts
  - presetFittings.ts
---

# fitting

EFT fitting import support. The module is responsible for parsing EFT text,
resolving fitted modules and charges against the generated fitting database,
aggregating exact ship and turret statistics for the `Ships` engine, and
extracting the fitted ewar loadout (stasis webs, tracking disruptors, and
scripts) for the `sim` module.

The public boundary is `index.ts`, which exports the `FittingImport`,
`ChargeCatalog`, `PresetFittings`, and `GunFamilies` abstractions, `FittingDb`,
`ImportedFitting`, `ImportedTurret`, `CargoCharge`, `ChargeOption`,
`PresetFitting`, `FittingRow`, `FittingSection`, `FittingSummary`,
and the module registration. `ImportedFitting.ewar` is an `EwarLoadout` from
the `sim` boundary. `FittingImport` consumes a `StackingPenalty` from the `sim`
boundary via DI. `FittingImport.summarize` produces a structural fitting
summary for UI previews. Icon and drone image identifiers have moved to the
`src/ui` module because they are presentational data. Internal files such as
`eft.ts`, `fittingImport.ts`, `fittingPresets.ts`, `chargeCatalog.ts`,
`gunFamilies.ts`, `presetFittings.ts`, `moduleSlots.ts`, `fittingDb.ts`, and
their sibling tests are reached only by their sibling tests and by `module.ts`.
