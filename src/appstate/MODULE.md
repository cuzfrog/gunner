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
  - settingsStore.ts
  - settingsCompat.ts
  - combatantSettings.ts
#  - validators.ts
#  - userSettings.ts
  - settingsParser.ts
#  - index.ts
---





# appstate

Application state persistence and serialization for user settings, profiles, saved fittings, URL sharing, and EFT profile text. Depends on ships/fitting/sim domain modules. Consumed by ui through its index.

The public surface is the cross-boundary DTOs, provider interfaces, and the `ProfileTextCodec` abstraction type. `UserSettings` and `ProfileSettings` are the wire-format DTOs for persistence, URL encoding, and profile text. `SessionSettings` and `CombatantSettings` are the parsed per-side session DTOs consumed by the UI directly — no further parsing or normalization is needed. `SettingsParser` owns wire/session conversion (`fromWire`, `toWire`, `fromProfile`) and legacy migration; `parseUserSettings` and `decodeUrlSettings` return `SessionSettings | null`. `StartupState` carries `SessionSettings | null` plus the selected profile name. `UserSettings` and `ProfileSettings` carry optional per-side e-war activation (`shipAEwarActivation`, `shipBEwarActivation`), turret-booster activation (`shipABoosterActivation`, `shipBBoosterActivation`), missile-booster activation (`shipAMissileBoosterActivation`, `shipBMissileBoosterActivation`), and sensor-booster activation (`shipASensorBoosterActivation`, `shipBSensorBoosterActivation`) for persisting module on/off, overload, and script choices. Profile-text parsing and serialization lives in the `profileText` sub-module, exposed as the `ProfileTextCodec` interface implemented by `LocalProfileTextCodec` and registered as `profileTextCodec` in the DI container; raw parse/serialize functions are internal to the sub-module. `SettingsStore`, `SavedFittings`, and `SettingsParser` are registered by `module.ts`. Gate relaxed: `userSettings.ts`, `validators.ts`, and `index.ts` are temporarily removed from `no-new-exports` to add `StoredSensorBoosterActivation` alongside the existing activation DTOs; `combatantSettings.ts` and `settingsParser.ts` remain relaxed for the prior defense and missile-booster persistence additions.
