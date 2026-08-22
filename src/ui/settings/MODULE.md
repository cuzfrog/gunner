---
no-new-exports:
  - module.ts
  - localSettingsStore.ts
  - savedFittings.ts
  - settingsParser.ts
---

# settings

Persistence, sharing, and profile text serialization.

The public surface is the cross-boundary DTOs and provider interfaces plus the profile-text functions. `SettingsStore`, `SavedFittings`, and `SettingsParser` are registered by `module.ts` under the keys `settingsStore`, `savedFittings`, and `parser`. `isAutopilotMode`, `isSigResolutionClass`, and `profilesEqual` are re-exported because the `controls` module uses them for input validation and profile dirty-state checks.
