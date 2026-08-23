import type { UserSettings, ProfileSettings, DisplayPreferences, StartupState } from "./userSettings";

export interface SettingsStore {
  loadStartupState(): StartupState;
  listProfiles(): string[];
  saveProfile(name: string, settings: ProfileSettings): void;
  loadProfile(name: string): ProfileSettings | null;
  deleteProfile(name: string): void;
  selectProfile(name: string): void;
  encodeUrl(settings: ProfileSettings): string;
  loadPreferences(): DisplayPreferences;
  savePreferences(preferences: DisplayPreferences): void;
}
