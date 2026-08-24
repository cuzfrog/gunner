---
no-new-exports:
  - defaultPreferences.ts
  - fittingBasis.ts
  - legacyScriptNames.ts
  - cradle.ts
  - savedFittings.ts
  - validators.test.ts
  - settingsParser.test.ts
  - module.ts
  - localSettingsStore.test.ts
  - urlCodec.test.ts
  - urlCodec.ts
  - language.ts
  - localSettingsStore.testSupport.ts
  - localSettingsStore.ts
  - profileEquality.test.ts
  - profileEquality.ts
  - providers.ts
  - savedFittings.test.ts
  - settingsParser.ts
  - settingsStore.ts
---

# appstate

Application state persistence and serialization for user settings, profiles, saved fittings, URL sharing, and EFT profile text. Depends on ships/fitting/sim domain modules. Consumed by ui through its index.

The public surface is the cross-boundary DTOs, provider interfaces, and the `ProfileTextCodec` abstraction type. `UserSettings` and `ProfileSettings` carry optional per-side e-war activation (`attackerEwarActivation`, `targetEwarActivation`) and turret-booster activation (`attackerBoosterActivation`, `targetBoosterActivation`) for persisting module on/off and script choices. Profile-text parsing and serialization lives in the `profileText` sub-module, exposed as the `ProfileTextCodec` interface implemented by `LocalProfileTextCodec` and registered as `profileTextCodec` in the DI container; raw parse/serialize functions are internal to the sub-module. `SettingsStore`, `SavedFittings`, and `SettingsParser` are registered by `module.ts`.
