---

# settings

Persistence, sharing, and profile text serialization.

The public surface is the cross-boundary DTOs and provider interfaces plus the profile-text functions. `LocalSettingsStore`, `LocalSavedFittings`, and `SettingsParser` are exported through the index for DI registration. `isAutopilotMode`, `isSigResolutionClass`, and `profilesEqual` are re-exported because the `controls` module uses them for input validation and profile dirty-state checks.
