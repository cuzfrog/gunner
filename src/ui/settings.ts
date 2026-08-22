import type { AutopilotMode, SigResolutionClass } from "../sim";
import type { FittedHull, PropulsionId, PropulsionStats, Ships, SkillLevel } from "../ships";
import type { ChargeCatalog, FittingImport } from "../fitting";
import type { Language } from "./i18n";

export const USER_SETTINGS_VERSION = 6 as const;
export const PROPULSION_NONE = "none" as const;
export type TrackingUnit = "rad" | "score";
export type PropulsionSelection = PropulsionId | typeof PROPULSION_NONE;

export interface FittedHullSummary {
  readonly fittingName: string;
  readonly propulsionId?: PropulsionId;
  readonly propulsionName?: string;
  readonly fitted: FittedHull;
  readonly propulsion?: PropulsionStats;
}

export type ProfileParamOverrides = Pick<
  UserSettings,
  | "attackerMass"
  | "attackerInertia"
  | "attackerSpeed"
  | "targetMass"
  | "targetInertia"
  | "targetSig"
  | "targetSpeed"
  | "tracking"
  | "sigRes"
  | "optimal"
  | "falloff"
>;

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
  attackerPropulsion?: PropulsionSelection;
  targetHull?: string;
  targetPropulsion?: PropulsionSelection;
  attackerFitting?: string;
  attackerOverrides?: Partial<ProfileParamOverrides>;
  targetFitting?: string;
  targetOverrides?: Partial<ProfileParamOverrides>;
  attackerFittedHull?: FittedHullSummary;
  targetFittedHull?: FittedHullSummary;
  attackerAmmo: string;
  simSpeed: number;
  language: Language;
}

export type ProfileSettings = Omit<UserSettings, "language" | "trackingUnit" | "simSpeed" | "gridBrightness" | "attackerAmmo"> & { attackerAmmo?: string };

export interface DisplayPreferences {
  readonly language: Language;
  readonly trackingUnit: TrackingUnit;
  readonly simSpeed: number;
  readonly gridBrightness: number;
}

export interface StartupState {
  readonly settings: UserSettings | null;
  readonly selectedProfileName: string | null;
}

export interface StorageProvider {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LocationProvider {
  readonly href: string;
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
  loadStartupState(): StartupState;
  listProfiles(): string[];
  saveProfile(name: string, settings: ProfileSettings): void;
  loadProfile(name: string): ProfileSettings | null;
  deleteProfile(name: string): void;
  selectProfile(name: string): void;
  encodeUrl(settings: UserSettings): string;
  loadPreferences(): DisplayPreferences;
  savePreferences(preferences: DisplayPreferences): void;
}

const PROFILES_KEY = "gunner-profiles-v6";
const SELECTED_PROFILE_KEY = "gunner-selected-profile-v6";
const MIGRATED_PROFILES_KEY = "gunner-profiles-v5";
const MIGRATED_SELECTED_PROFILE_KEY = "gunner-selected-profile-v5";
const PREFERENCES_KEY = "gunner-prefs-v1";
const URL_PARAM = "c";
const DEFAULT_TURRET_CHARGE_SIZE = 1;
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
    const parsed = this.parseProfiles(raw);
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
    return this.tryParseEncoded(encoded);
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
    return this.parseProfiles(raw);
  }

  private parseUserSettings(raw: string): UserSettings | null {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!this.isUserSettings(parsed)) return null;
      parsed.version = USER_SETTINGS_VERSION;
      if (parsed.attackerAmmo === undefined) {
        parsed.attackerAmmo = this.chargeCatalog.usualForChargeSize(DEFAULT_TURRET_CHARGE_SIZE);
      }
      return parsed;
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
    const s = value as Record<string, unknown>;
    return this.isProfileSettings(value) && isLanguage(s.language) && (s.trackingUnit === "rad" || s.trackingUnit === "score");
  }

  private isProfileSettings(value: unknown): value is ProfileSettings {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const s = value as Record<string, unknown>;
    return (
      isSettingsVersion(s.version) &&
      isNonNegative(s.tracking) &&
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
      this.isOptionalPropulsionSelection(s.attackerPropulsion) &&
      isOptionalNonEmptyString(s.targetHull) &&
      this.isOptionalPropulsionSelection(s.targetPropulsion) &&
      isOptionalFittedHullSummary(s.attackerFittedHull) &&
      isOptionalFittedHullSummary(s.targetFittedHull) &&
      isOptionalFittingText(s.attackerFitting) &&
      isOptionalFittingText(s.targetFitting) &&
      isOptionalProfileParamOverrides(s.attackerOverrides) &&
      isOptionalProfileParamOverrides(s.targetOverrides) &&
      isOptionalNonEmptyString(s.attackerAmmo)
    );
  }

  private isOptionalPropulsionSelection(value: unknown): value is PropulsionSelection | undefined {
    return value === undefined || value === PROPULSION_NONE || this.ships.parsePropulsionId(value) !== undefined;
  }

  private toProfileSettings(value: unknown): ProfileSettings | null {
    if (!this.isProfileSettings(value)) return null;
    const withVersion = { ...value, version: USER_SETTINGS_VERSION };
    if (withVersion.attackerAmmo === undefined) {
      withVersion.attackerAmmo = this.chargeCatalog.usualForChargeSize(DEFAULT_TURRET_CHARGE_SIZE);
    }
    return stripDisplayPreferences(withVersion);
  }

  private applyFittingBasis(settings: UserSettings): UserSettings {
    return {
      ...settings,
      ...this.rebuildSide(settings, "attacker"),
      ...this.rebuildSide(settings, "target"),
    };
  }

  private rebuildSide(
    settings: UserSettings,
    side: "attacker" | "target",
  ): Partial<UserSettings> {
    const fittingKey = side === "attacker" ? "attackerFitting" : "targetFitting";
    const text = settings[fittingKey];
    if (!text) return {};

    const skillLevel = side === "attacker" ? settings.attackerSkillLevel ?? 5 : settings.targetSkillLevel ?? 5;
    const overloaded = side === "attacker" ? settings.attackerOverload ?? true : settings.targetOverload ?? true;
    const imported = this.fittingImport.importFitting(text, { skillLevel, overloaded });
    if (!imported) return {};

    const conditions = { skillLevel, overloaded };
    const profile = imported.profile;
    const propulsionKey = side === "attacker" ? "attackerPropulsion" : "targetPropulsion";
    const storedPropulsionId = settings[propulsionKey];
    const storedFittedHull = side === "attacker" ? settings.attackerFittedHull : settings.targetFittedHull;
    const importedPropulsion = imported.propulsion;
    const importedPropulsionId = importedPropulsion?.propulsionId;
    const explicitNone = storedPropulsionId === PROPULSION_NONE;
    let activePropulsionId: PropulsionId | undefined;
    let activePropulsion: PropulsionStats | undefined;
    let activePropulsionName: string | undefined;

    if (!explicitNone) {
      activePropulsionId = storedPropulsionId ?? importedPropulsionId;
      if (activePropulsionId && storedFittedHull?.propulsionId === activePropulsionId && storedFittedHull.propulsionName) {
        const exact = this.fittingImport.propulsionStats(storedFittedHull.propulsionName);
        if (exact) {
          activePropulsion = exact;
          activePropulsionName = storedFittedHull.propulsionName;
        }
      }
      if (!activePropulsion) {
        const generic = activePropulsionId ? this.ships.fittingOption(profile, activePropulsionId) : undefined;
        if (generic) {
          const variants = this.fittingImport.propulsionVariantNames(generic);
          activePropulsionName = variants.find((name) => name === generic.label) ?? variants[0] ?? generic.label;
          activePropulsion = this.fittingImport.propulsionStats(activePropulsionName) ?? generic;
        }
      }
      if (!activePropulsion && importedPropulsion) {
        activePropulsion = importedPropulsion;
        activePropulsionId = importedPropulsionId;
        activePropulsionName = importedPropulsion.propulsionName ?? activePropulsionName;
      }
    }
    const fittedPropulsion = explicitNone ? importedPropulsion : activePropulsion;
    const fittedPropulsionId = explicitNone ? importedPropulsionId : activePropulsionId;
    const fittedPropulsionName = explicitNone ? importedPropulsion?.propulsionName : activePropulsionName;
    const fittedHull: FittedHullSummary = {
      fittingName: imported.fittingName,
      propulsionId: fittedPropulsionId,
      propulsionName: fittedPropulsionName,
      fitted: imported.fitted,
      propulsion: fittedPropulsion,
    };
    const stats = this.ships.fittedStats(profile, fittedHull.fitted, activePropulsion, conditions);
    const overrides = side === "attacker" ? settings.attackerOverrides : settings.targetOverrides;
    const override = overrides ?? {};
    const massOverride = side === "attacker" ? override.attackerMass : override.targetMass;
    const mass = massOverride ?? stats.mass;
    const speedOverride = side === "attacker" ? override.attackerSpeed : override.targetSpeed;
    const speed = speedOverride ?? this.ships.maxSpeedForFittedMass(profile, fittedHull.fitted, mass, activePropulsion, conditions);

    const result: Partial<UserSettings> = {};
    if (side === "attacker") {
      result.attackerHull = imported.profile.name;
      result.attackerPropulsion = explicitNone ? PROPULSION_NONE : activePropulsionId;
      result.attackerFittedHull = fittedHull;
      result.attackerMass = mass;
      result.attackerInertia = override.attackerInertia ?? stats.inertiaModifier;
      result.attackerSpeed = speed;
    } else {
      result.targetHull = imported.profile.name;
      result.targetPropulsion = explicitNone ? PROPULSION_NONE : activePropulsionId;
      result.targetFittedHull = fittedHull;
      result.targetMass = mass;
      result.targetInertia = override.targetInertia ?? stats.inertiaModifier;
      result.targetSpeed = speed;
      result.targetSig = override.targetSig ?? stats.sigRadius;
    }
    if (side === "attacker" && imported.turret) {
      const options = this.chargeCatalog.chargesForSize(imported.turret.chargeSize);
      const storedAmmo = settings.attackerAmmo;
      const valid = options.some((c) => c.name === storedAmmo);
      const turret = valid ? this.chargeCatalog.withCharge(imported.turret, storedAmmo) : imported.turret;
      result.tracking = override.tracking ?? turret.tracking;
      result.sigRes = override.sigRes ?? turret.sigResolutionClass;
      result.optimal = override.optimal ?? turret.optimal;
      result.falloff = override.falloff ?? turret.falloff;
      result.attackerAmmo = turret.charge;
    }
    return result;
  }
}

function isProfileStorage(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function stripDisplayPreferences(value: ProfileSettings): ProfileSettings {
  const { language: _, trackingUnit: __, simSpeed: ___, gridBrightness: ____, ...rest } = value as Record<string, unknown>;
  return rest as ProfileSettings;
}

function profilesEqual(a: ProfileSettings, b: ProfileSettings): boolean {
  return JSON.stringify(a, Object.keys(a).sort()) === JSON.stringify(b, Object.keys(b).sort());
}

function isSigResolutionClass(value: unknown): value is SigResolutionClass {
  return value === "S" || value === "M" || value === "L" || value === "XL";
}

function isAutopilotMode(value: unknown): value is AutopilotMode {
  return value === "orbit" || value === "keepAtRange" || value === "midships";
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

function isSettingsVersion(value: unknown): value is 5 | 6 {
  return value === 5 || value === 6;
}

function isOptionalFittingText(value: unknown): value is string | undefined {
  return value === undefined || (typeof value === "string" && value.length > 0);
}

const PROFILE_PARAM_OVERRIDE_KEYS: readonly (keyof ProfileParamOverrides)[] = [
  "attackerMass",
  "attackerInertia",
  "attackerSpeed",
  "targetMass",
  "targetInertia",
  "targetSig",
  "targetSpeed",
  "tracking",
  "sigRes",
  "optimal",
  "falloff",
];

function isOptionalProfileParamOverrides(value: unknown): value is Partial<ProfileParamOverrides> | undefined {
  if (value === undefined) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as Record<string, unknown>;
  for (const key of Object.keys(s)) {
    if (!PROFILE_PARAM_OVERRIDE_KEYS.includes(key as keyof ProfileParamOverrides)) return false;
    if (key === "sigRes") {
      if (!(s[key] === undefined || isSigResolutionClass(s[key]))) return false;
    } else if (key === "targetSig") {
      if (!(s[key] === undefined || isPositive(s[key]))) return false;
    } else {
      if (!(s[key] === undefined || isNonNegative(s[key]))) return false;
    }
  }
  return true;
}

function isOptionalFittedHullSummary(value: unknown): value is FittedHullSummary | undefined {
  if (value === undefined) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as Record<string, unknown>;
  if (typeof s.fittingName !== "string") return false;
  if (!isFittedHull(s.fitted)) return false;
  if (!isOptionalPropulsionStats(s.propulsion)) return false;
  if (s.propulsionId !== undefined && typeof s.propulsionId !== "string") return false;
  if (s.propulsionName !== undefined && typeof s.propulsionName !== "string") return false;
  return true;
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
