# fitting

EFT fitting import support. The module is responsible for parsing EFT text,
resolving fitted modules and charges against the generated fitting database,
and aggregating exact ship and turret statistics for the `Ships` engine.

The public boundary is `index.ts`, which exports the `FittingImport`,
`ChargeCatalog`, and `PresetFittings` abstractions, `FittingDb`,
`ImportedFitting`, `ImportedTurret`, `CargoCharge`, `ChargeOption`,
`PresetFitting`, and the module registration. Internal files such as
`eft.ts`, `fittingImport.ts`, `fittingPresets.ts`, `chargeCatalog.ts`,
`presetFittings.ts`, and `chargeCatalog.test.ts` are reached only by their
sibling tests and by `module.ts`.
