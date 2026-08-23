---
no-new-exports:
  - fittingBasis.ts
  - cradle.ts
  - index.ts
  - language.ts
  - localSettingsStore.test.ts
  - localSettingsStore.testSupport.ts
  - localSettingsStore.ts
  - module.ts
  - providers.ts
  - savedFittings.test.ts
  - savedFittings.ts
  - settingsParser.test.ts
  - settingsParser.ts
  - settingsStore.ts
  - urlCodec.test.ts
  - urlCodec.ts
  - userSettings.ts
  - validators.test.ts
  - validators.ts
---


# appstate

Application state persistence and serialization for user settings, profiles, saved fittings, URL sharing, and EFT profile text. Depends on ships/fitting/sim domain modules. Consumed by ui through its index.

The public surface is the cross-boundary DTOs and provider interfaces plus the profile-text functions. Profile-text parsing and serialization lives in the `profileText` sub-module, which exposes `parseProfile`, `serializeProfile`, and `PROFILE_TEXT_HEADER` through its index. `SettingsStore`, `SavedFittings`, and `SettingsParser` are registered by `module.ts`.
