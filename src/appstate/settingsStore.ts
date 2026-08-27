import type { UserSettings, ProfileSettings, DisplayPreferences } from "./userSettings";
import type { StartupState } from "./combatantSettings";

export interface SettingsStore {
  loadStartupState(): StartupState;
  listProfiles(): string[];
  saveProfile(name: string, settings: ProfileSettings): void;
  loadProfile(name: string): ProfileSettings | null;
  deleteProfile(name: string): void;
  selectProfile(name: string): void;
  clearSelectedProfile(): void;
  encodeUrl(settings: ProfileSettings): string;
  loadPreferences(): DisplayPreferences;
  savePreferences(preferences: DisplayPreferences): void;
}
