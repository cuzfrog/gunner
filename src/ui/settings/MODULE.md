---
no-new-exports:
  - fittingBasis.ts
  - localSettingsStore.testSupport.ts
  - localSettingsStore.ts
  - module.ts
  - profileText/profileText.testSupport.ts
  - profileText/profileText.ts
  - profileText/profileTextFields.ts
  - profileText/profileTextValidate.ts
  - providers.ts
  - savedFittings.ts
  - settingsParser.ts
  - settingsStore.ts
  - urlCodec.ts
  - userSettings.ts
  - validators.ts
---

# settings

Persistence, sharing, and profile text serialization.

The public surface is the cross-boundary DTOs and provider interfaces plus the profile-text functions. Profile-text parsing and serialization lives in the `profileText` sub-module, which exposes `parseProfile`, `serializeProfile`, and `PROFILE_TEXT_HEADER` through its index. `SettingsStore`, `SavedFittings`, and `SettingsParser` are registered by `module.ts`.
