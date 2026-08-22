import type { ChargeCatalog, FittingImport } from "../../fitting";
import type { Ships } from "../../ships";
import type { ClipboardProvider, LocationProvider, StorageProvider } from "./providers";
import type { SettingsStore } from "./settingsStore";
import { type DisplayPreferences, type ProfileSettings, type StartupState, type UserSettings } from "./userSettings";
import { decodeUrlSettings, parseProfiles } from "./settingsCodec";
import { rebuildFittingBasis } from "./rebuildFittingBasis";
import { encodeBase64, URL_PARAM } from "./urlCodec";
import { isLanguage, isOptionalUnitInterval, isPositive, profilesEqual, stripDisplayPreferences } from "./validators";

const PROFILES_KEY = "gunner-profiles-v6";
const SELECTED_PROFILE_KEY = "gunner-selected-profile-v6";
const MIGRATED_PROFILES_KEY = "gunner-profiles-v5";
const MIGRATED_SELECTED_PROFILE_KEY = "gunner-selected-profile-v5";
const PREFERENCES_KEY = "gunner-prefs-v1";
const DEFAULT_PREFERENCES: DisplayPreferences = { language: "en", trackingUnit: "rad", simSpeed: 4, gridBrightness: 0.2 };

export class LocalSettingsStore implements SettingsStore {
  private readonly storage: StorageProvider;
  private readonly location: LocationProvider;
  private readonly ships: Ships;
  private readonly fittingImport: FittingImport;
  private readonly chargeCatalog: ChargeCatalog;

  constructor({
    storage,
    location,
    ships,
    fittingImport,
    chargeCatalog,
  }: {
    storage: StorageProvider;
    location: LocationProvider;
    ships: Ships;
    fittingImport: FittingImport;
    chargeCatalog: ChargeCatalog;
  }) {
    this.storage = storage;
    this.location = location;
    this.ships = ships;
    this.fittingImport = fittingImport;
    this.chargeCatalog = chargeCatalog;
  }

  loadStartupState(): StartupState {
    const urlSettings = this.decodeUrl();
    if (urlSettings) {
      const settings = this.applyFittingBasis(urlSettings);
      return { settings, selectedProfileName: this.matchingSelectedProfile(settings) };
    }
    const name = this.readSelectedProfileName();
    if (!name || !this.listProfiles().includes(name)) return { settings: null, selectedProfileName: null };
    return { settings: null, selectedProfileName: name };
  }

  listProfiles(): string[] {
    const raw = this.storage.getItem(PROFILES_KEY);
    if (!raw) return [];
    const parsed = parseProfiles({ ships: this.ships, chargeCatalog: this.chargeCatalog }, raw);
    return Object.keys(parsed).sort();
  }

  saveProfile(name: string, settings: ProfileSettings): void {
    const profiles = this.loadProfiles();
    profiles[name] = stripDisplayPreferences(settings);
    this.storage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  }

  loadProfile(name: string): ProfileSettings | null {
    const profiles = this.loadProfiles();
    const profile = profiles[name];
    if (!profile) return null;
    return { ...profile };
  }

  deleteProfile(name: string): void {
    const profiles = this.loadProfiles();
    delete profiles[name];
    if (Object.keys(profiles).length === 0) {
      this.storage.removeItem(PROFILES_KEY);
    } else {
      this.storage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    }
    const selected = this.readSelectedProfileName();
    if (selected === name) {
      this.storage.removeItem(SELECTED_PROFILE_KEY);
      this.storage.removeItem(MIGRATED_SELECTED_PROFILE_KEY);
    }
  }

  selectProfile(name: string): void {
    if (!name) throw new Error("selected profile name cannot be empty");
    this.storage.setItem(SELECTED_PROFILE_KEY, name);
  }

  encodeUrl(settings: UserSettings): string {
    const url = new URL(this.location.href);
    url.searchParams.set(URL_PARAM, encodeBase64(settings));
    return url.toString();
  }

  loadPreferences(): DisplayPreferences {
    const raw = this.storage.getItem(PREFERENCES_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ...DEFAULT_PREFERENCES };
      const s = parsed as Record<string, unknown>;
      return {
        language: isLanguage(s.language) ? s.language : DEFAULT_PREFERENCES.language,
        trackingUnit: s.trackingUnit === "score" ? "score" : DEFAULT_PREFERENCES.trackingUnit,
        simSpeed: isPositive(s.simSpeed) ? s.simSpeed : DEFAULT_PREFERENCES.simSpeed,
        gridBrightness: isOptionalUnitInterval(s.gridBrightness) && s.gridBrightness !== undefined ? s.gridBrightness : DEFAULT_PREFERENCES.gridBrightness,
      };
    } catch {
      return { ...DEFAULT_PREFERENCES };
    }
  }

  savePreferences(preferences: DisplayPreferences): void {
    this.storage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  }

  private decodeUrl(): UserSettings | null {
    const url = new URL(this.location.href);
    const encoded = url.searchParams.get(URL_PARAM);
    if (!encoded) return null;
    return decodeUrlSettings({ ships: this.ships, chargeCatalog: this.chargeCatalog }, encoded);
  }

  private matchingSelectedProfile(urlSettings: UserSettings): string | null {
    const name = this.readSelectedProfileName();
    if (!name) return null;
    const profile = this.loadProfile(name);
    if (!profile) return null;
    return profilesEqual(profile, stripDisplayPreferences(urlSettings)) ? name : null;
  }

  private readSelectedProfileName(): string | null {
    const raw = this.storage.getItem(SELECTED_PROFILE_KEY) ?? this.storage.getItem(MIGRATED_SELECTED_PROFILE_KEY);
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === "string" && parsed.length > 0) return parsed;
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        const name = (parsed as Record<string, unknown>).name;
        if (typeof name === "string" && name.length > 0) return name;
      }
    } catch {
      // Plain name written directly without JSON encoding.
    }
    return raw.length > 0 ? raw : null;
  }

  private loadProfiles(): Record<string, ProfileSettings> {
    const raw = this.storage.getItem(PROFILES_KEY) ?? this.storage.getItem(MIGRATED_PROFILES_KEY);
    if (!raw) return {};
    return parseProfiles({ ships: this.ships, chargeCatalog: this.chargeCatalog }, raw);
  }

  private applyFittingBasis(settings: UserSettings): UserSettings {
    const deps = { ships: this.ships, fittingImport: this.fittingImport, chargeCatalog: this.chargeCatalog };
    return { ...settings, ...rebuildFittingBasis(deps, settings, "attacker"), ...rebuildFittingBasis(deps, settings, "target") };
  }
}
