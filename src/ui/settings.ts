import type { AutopilotMode, SigResolutionClass } from "../sim";
import type { FittedHull, PropulsionId, PropulsionStats, Ships, SkillLevel } from "../ships";
import type { Language } from "./i18n";
import type { TrackingUnit } from "./trackingInput";

export const USER_SETTINGS_VERSION = 5 as const;

export interface FittedHullSummary {
  readonly fittingName: string;
  readonly propulsionId?: PropulsionId;
  readonly fitted: FittedHull;
  readonly propulsion?: PropulsionStats;
}

export interface UserSettings {
  version: typeof USER_SETTINGS_VERSION;
  tracking: number;
  trackingUnit: TrackingUnit;
  sigRes: SigResolutionClass;
  optimal: number;
  falloff: number;
  attackerSpeed: number;
  attackerMode: AutopilotMode;
  attackerRange: number;
  maneuverAggressivity?: number;
  gridBrightness?: number;
  attackerMass: number;
  attackerInertia: number;
  attackerSkillLevel?: SkillLevel;
  attackerOverload?: boolean;
  initialDistance: number;
  targetSpeed: number;
  targetMode: AutopilotMode;
  targetRange: number;
  targetMass: number;
  targetInertia: number;
  targetSig: number;
  targetSkillLevel?: SkillLevel;
  targetOverload?: boolean;
  attackerHull?: string;
  attackerPropulsion?: PropulsionId;
  targetHull?: string;
  targetPropulsion?: PropulsionId;
  attackerFittedHull?: FittedHullSummary;
  targetFittedHull?: FittedHullSummary;
  simSpeed: number;
  language: Language;
}

export type ProfileSettings = Omit<UserSettings, "language">;

export interface StorageProvider {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LocationProvider {
  readonly href: string;
  replace(url: string): void;
}

export class ClipboardUnavailableError extends Error {
  constructor() {
    super("Clipboard unavailable");
  }
}

export interface ClipboardProvider {
  readText(): Promise<string>;
  writeText(text: string): Promise<void>;
}

export interface SettingsStore {
  load(): UserSettings | null;
  save(settings: UserSettings): void;
  listProfiles(): string[];
  saveProfile(name: string, settings: ProfileSettings): void;
  loadProfile(name: string): ProfileSettings | null;
  deleteProfile(name: string): void;
  encodeUrl(settings: UserSettings): string;
  decodeUrl(): UserSettings | null;
  writeUrlToClipboard(settings: UserSettings, clipboard?: ClipboardProvider): Promise<boolean>;
  hasForeignUrlSettings(): boolean;
  loadSelectedProfile(): { name: string; baseline: ProfileSettings } | null;
  saveSelectedProfile(name: string, baseline: ProfileSettings): void;
  clearSelectedProfile(): void;
}

const SETTINGS_KEY = "gunner-settings-v5";
const PROFILES_KEY = "gunner-profiles-v5";
const SELECTED_PROFILE_KEY = "gunner-selected-profile-v5";
const URL_PARAM = "c";

export class LocalSettingsStore implements SettingsStore {
  private readonly storage: StorageProvider;
  private readonly location: LocationProvider;
  private readonly ships: Ships;

  constructor({ storage, location, ships }: { storage: StorageProvider; location: LocationProvider; ships: Ships }) {
    this.storage = storage;
    this.location = location;
    this.ships = ships;
  }

  load(): UserSettings | null {
    const urlSettings = this.decodeUrl();
    if (urlSettings) return urlSettings;
    return this.loadLocalSettings();
  }

  save(settings: UserSettings): void {
    this.storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  listProfiles(): string[] {
    const raw = this.storage.getItem(PROFILES_KEY);
    if (!raw) return [];
    const parsed = this.parseProfiles(raw);
    return Object.keys(parsed).sort();
  }

  saveProfile(name: string, settings: ProfileSettings): void {
    const profiles = this.loadProfiles();
    profiles[name] = stripLanguage(settings);
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
    const selected = this.loadSelectedProfile();
    if (selected?.name === name) {
      this.clearSelectedProfile();
    }
  }

  encodeUrl(settings: UserSettings): string {
    const url = new URL(this.location.href);
    url.searchParams.set(URL_PARAM, encodeBase64(settings));
    return url.toString();
  }

  decodeUrl(): UserSettings | null {
    const url = new URL(this.location.href);
    const encoded = url.searchParams.get(URL_PARAM);
    if (!encoded) return null;
    return this.tryParseEncoded(encoded);
  }

  async writeUrlToClipboard(settings: UserSettings, clipboard?: ClipboardProvider): Promise<boolean> {
    if (!clipboard) return false;
    try {
      await clipboard.writeText(this.encodeUrl(settings));
      return true;
    } catch {
      return false;
    }
  }

  hasForeignUrlSettings(): boolean {
    const urlSettings = this.decodeUrl();
    if (!urlSettings) return false;
    const localSettings = this.loadLocalSettings();
    return !localSettings || JSON.stringify(urlSettings) !== JSON.stringify(localSettings);
  }

  loadSelectedProfile(): { name: string; baseline: ProfileSettings } | null {
    const raw = this.storage.getItem(SELECTED_PROFILE_KEY);
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isSelectedProfile(parsed)) return null;
      const baseline = this.toProfileSettings(parsed.baseline);
      if (!baseline) return null;
      return { name: parsed.name, baseline };
    } catch {
      return null;
    }
  }

  saveSelectedProfile(name: string, baseline: ProfileSettings): void {
    if (!name) throw new Error("selected profile name cannot be empty");
    const selected: { name: string; baseline: ProfileSettings } = { name, baseline: stripLanguage(baseline) };
    this.storage.setItem(SELECTED_PROFILE_KEY, JSON.stringify(selected));
  }

  clearSelectedProfile(): void {
    this.storage.removeItem(SELECTED_PROFILE_KEY);
  }

  private loadProfiles(): Record<string, ProfileSettings> {
    const raw = this.storage.getItem(PROFILES_KEY);
    if (!raw) return {};
    return this.parseProfiles(raw);
  }

  private loadLocalSettings(): UserSettings | null {
    const raw = this.storage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    return this.parseUserSettings(raw);
  }

  private parseUserSettings(raw: string): UserSettings | null {
    try {
      const parsed: unknown = JSON.parse(raw);
      return this.isUserSettings(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private parseProfiles(raw: string): Record<string, ProfileSettings> {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isProfileStorage(parsed)) return {};
      const result: Record<string, ProfileSettings> = {};
      for (const name of Object.keys(parsed)) {
        const settings = this.toProfileSettings(parsed[name]);
        if (settings) result[name] = settings;
      }
      return result;
    } catch {
      return {};
    }
  }

  private tryParseEncoded(encoded: string): UserSettings | null {
    try {
      return this.parseUserSettings(decodeBase64(encoded));
    } catch {
      return null;
    }
  }

  private isUserSettings(value: unknown): value is UserSettings {
    return this.isProfileSettings(value) && isLanguage((value as Record<string, unknown>).language);
  }

  private isProfileSettings(value: unknown): value is ProfileSettings {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const s = value as Record<string, unknown>;
    return (
      s.version === USER_SETTINGS_VERSION &&
      isNonNegative(s.tracking) &&
      (s.trackingUnit === "rad" || s.trackingUnit === "score") &&
      isSigResolutionClass(s.sigRes) &&
      isNonNegative(s.optimal) &&
      isNonNegative(s.falloff) &&
      isNonNegative(s.attackerSpeed) &&
      isAutopilotMode(s.attackerMode) &&
      isNonNegative(s.attackerRange) &&
      isOptionalNonNegative(s.maneuverAggressivity) &&
      isOptionalUnitInterval(s.gridBrightness) &&
      isNonNegative(s.attackerMass) &&
      isNonNegative(s.attackerInertia) &&
      isOptionalSkillLevel(s.attackerSkillLevel) &&
      isOptionalBoolean(s.attackerOverload) &&
      isPositive(s.initialDistance) &&
      isNonNegative(s.targetSpeed) &&
      isAutopilotMode(s.targetMode) &&
      isNonNegative(s.targetRange) &&
      isNonNegative(s.targetMass) &&
      isNonNegative(s.targetInertia) &&
      isOptionalSkillLevel(s.targetSkillLevel) &&
      isOptionalBoolean(s.targetOverload) &&
      isPositive(s.targetSig) &&
      isOptionalNonEmptyString(s.attackerHull) &&
      this.isOptionalPropulsionId(s.attackerPropulsion) &&
      isOptionalNonEmptyString(s.targetHull) &&
      this.isOptionalPropulsionId(s.targetPropulsion) &&
      isOptionalFittedHullSummary(s.attackerFittedHull) &&
      isOptionalFittedHullSummary(s.targetFittedHull) &&
      isPositive(s.simSpeed)
    );
  }

  private isOptionalPropulsionId(value: unknown): value is PropulsionId | undefined {
    return value === undefined || this.ships.parsePropulsionId(value) !== undefined;
  }

  private toProfileSettings(value: unknown): ProfileSettings | null {
    if (!this.isProfileSettings(value)) return null;
    return stripLanguage(value);
  }
}

function isProfileStorage(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isSelectedProfile(value: unknown): value is { name: string; baseline: unknown } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as Record<string, unknown>;
  return typeof s.name === "string" && s.name.length > 0 && !!s.baseline && typeof s.baseline === "object" && !Array.isArray(s.baseline);
}

function stripLanguage(value: ProfileSettings): ProfileSettings {
  const { language: _, ...rest } = value as Record<string, unknown>;
  return rest as ProfileSettings;
}

function isSigResolutionClass(value: unknown): value is SigResolutionClass {
  return value === "S" || value === "M" || value === "L" || value === "XL";
}

function isAutopilotMode(value: unknown): value is AutopilotMode {
  return value === "orbit" || value === "keepAtRange";
}

function isLanguage(value: unknown): value is Language {
  return value === "en" || value === "zh" || value === "ja";
}

function isOptionalNonEmptyString(value: unknown): value is string | undefined {
  return value === undefined || (typeof value === "string" && value.length > 0);
}

function isSkillLevel(value: unknown): value is SkillLevel {
  return value === 0 || value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

function isOptionalSkillLevel(value: unknown): value is SkillLevel | undefined {
  return value === undefined || isSkillLevel(value);
}

function isOptionalBoolean(value: unknown): value is boolean | undefined {
  return value === undefined || typeof value === "boolean";
}

function isOptionalNonNegative(value: unknown): value is number | undefined {
  return value === undefined || (isFiniteNumber(value) && value >= 0);
}

function isOptionalUnitInterval(value: unknown): value is number | undefined {
  return value === undefined || (isFiniteNumber(value) && value >= 0 && value <= 1);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegative(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

function isPositive(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

function isOptionalFittedHullSummary(value: unknown): value is FittedHullSummary | undefined {
  if (value === undefined) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as Record<string, unknown>;
  return typeof s.fittingName === "string" && s.fittingName.length > 0 && isFittedHull(s.fitted) && isOptionalPropulsionStats(s.propulsion) && (s.propulsionId === undefined || typeof s.propulsionId === "string");
}

function isFittedHull(value: unknown): value is FittedHull {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as Record<string, unknown>;
  if (s.massMultiplier === undefined) s.massMultiplier = 1;
  return (
    isNonNegative(s.mass) &&
    isPositive(s.massMultiplier) &&
    isPositive(s.speedMultiplier) &&
    isPositive(s.inertiaMultiplier) &&
    isPositive(s.sigMultiplier) &&
    isNonNegative(s.sigRadiusAdd)
  );
}

function isOptionalPropulsionStats(value: unknown): value is PropulsionStats | undefined {
  if (value === undefined) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as Record<string, unknown>;
  return isNonNegative(s.thrust) && isNonNegative(s.speedBonus) && isNonNegative(s.massAddition) && isNonNegative(s.sigBloom);
}

function encodeBase64(value: unknown): string {
  const json = JSON.stringify(value);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(json).toString("base64url");
  }
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64(encoded: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(encoded, "base64url").toString("utf8");
  }
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (normalized.length % 4)) % 4;
  const padded = normalized.padEnd(normalized.length + padding, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}
