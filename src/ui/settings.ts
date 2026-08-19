import type { AutopilotMode, SigResolutionClass, TrackingUnit } from "../sim";
import { isPropulsionId, type PropulsionId, type SkillLevel } from "../ships";
import type { Language } from "./i18n";

export const USER_SETTINGS_VERSION = 5 as const;

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
  simSpeed: number;
  language: Language;
}

export interface StorageProvider {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LocationProvider {
  readonly href: string;
  replace(url: string): void;
}

export interface ClipboardProvider {
  writeText(text: string): Promise<void>;
}

export interface SettingsStore {
  load(): UserSettings | null;
  save(settings: UserSettings): void;
  listProfiles(): string[];
  saveProfile(name: string, settings: UserSettings): void;
  loadProfile(name: string): UserSettings | null;
  deleteProfile(name: string): void;
  encodeUrl(settings: UserSettings): string;
  decodeUrl(): UserSettings | null;
  writeUrlToClipboard(settings: UserSettings, clipboard?: ClipboardProvider): Promise<boolean>;
}

const SETTINGS_KEY = "gunner-settings-v5";
const PROFILES_KEY = "gunner-profiles-v5";
const URL_PARAM = "c";

export class LocalSettingsStore implements SettingsStore {
  private readonly storage: StorageProvider;
  private readonly location: LocationProvider;

  constructor({ storage, location }: { storage: StorageProvider; location: LocationProvider }) {
    this.storage = storage;
    this.location = location;
  }

  load(): UserSettings | null {
    const urlSettings = this.decodeUrl();
    if (urlSettings) return urlSettings;
    const raw = this.storage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    return parseUserSettings(raw);
  }

  save(settings: UserSettings): void {
    this.storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  listProfiles(): string[] {
    const raw = this.storage.getItem(PROFILES_KEY);
    if (!raw) return [];
    const parsed = parseProfiles(raw);
    return Object.keys(parsed).sort();
  }

  saveProfile(name: string, settings: UserSettings): void {
    const profiles = this.loadProfiles();
    profiles[name] = settings;
    this.storage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  }

  loadProfile(name: string): UserSettings | null {
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
    const settings = tryParseEncoded(encoded);
    if (!settings) return null;
    url.searchParams.delete(URL_PARAM);
    this.location.replace(url.toString());
    return settings;
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

  private loadProfiles(): Record<string, UserSettings> {
    const raw = this.storage.getItem(PROFILES_KEY);
    if (!raw) return {};
    return parseProfiles(raw);
  }
}

function parseUserSettings(raw: string): UserSettings | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return isUserSettings(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parseProfiles(raw: string): Record<string, UserSettings> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isProfileStorage(parsed)) return {};
    const result: Record<string, UserSettings> = {};
    for (const name of Object.keys(parsed)) {
      const settings = isUserSettings(parsed[name]) ? parsed[name] : null;
      if (settings) result[name] = settings;
    }
    return result;
  } catch {
    return {};
  }
}

function tryParseEncoded(encoded: string): UserSettings | null {
  try {
    return parseUserSettings(decodeBase64(encoded));
  } catch {
    return null;
  }
}

function isProfileStorage(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isUserSettings(value: unknown): value is UserSettings {
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
    isOptionalPropulsionId(s.attackerPropulsion) &&
    isOptionalNonEmptyString(s.targetHull) &&
    isOptionalPropulsionId(s.targetPropulsion) &&
    isPositive(s.simSpeed) &&
    isLanguage(s.language)
  );
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

function isOptionalPropulsionId(value: unknown): value is PropulsionId | undefined {
  return value === undefined || isPropulsionId(value);
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
  return value === undefined || (isFiniteNumber(value) && (value as number) >= 0);
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
