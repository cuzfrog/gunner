---

# settings

Persistence, sharing, and profile text serialization.

The public surface is the cross-boundary DTOs and provider interfaces (`UserSettings`, `ProfileSettings`, `DisplayPreferences`, `StartupState`, `SettingsStore`, `StorageProvider`, `LocationProvider`, `ClipboardProvider`, `SavedFittings`, `SavedFitting`) plus the profile-text functions (`serializeProfile`, `parseProfile`, `PROFILE_TEXT_HEADER`). `LocalSettingsStore`, `LocalSavedFittings`, and `SettingsParser` are exported through the index for registration in `src/ui/module.ts`.
