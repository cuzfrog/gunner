---
no-new-exports:
  - defaultPreferences.ts
  - fittingBasis.ts
  - cradle.ts
  - validators.ts
  - savedFittings.ts
  - validators.test.ts
  - settingsParser.test.ts
  - module.ts
  - localSettingsStore.test.ts
  - urlCodec.test.ts
  - urlCodec.ts
  - userSettings.ts
  - localSettingsStore.testSupport.ts
  - providers.ts
  - settingsParser.ts
  - localSettingsStore.ts
  - savedFittings.test.ts
  - index.ts
  - settingsStore.ts
  - language.ts
---



# appstate

Application state persistence and serialization for user settings, profiles, saved fittings, URL sharing, and EFT profile text. Depends on ships/fitting/sim domain modules. Consumed by ui through its index.

The public surface is the cross-boundary DTOs and provider interfaces plus the profile-text functions. `UserSettings` and `ProfileSettings` now carry optional per-side e-war activation (`attackerEwarActivation`, `targetEwarActivation`) for persisting web on/off states and disruptor script choices. Profile-text parsing and serialization lives in the `profileText` sub-module, which exposes `parseProfile`, `serializeProfile`, and `PROFILE_TEXT_HEADER` through its index. `SettingsStore`, `SavedFittings`, and `SettingsParser` are registered by `module.ts`.
