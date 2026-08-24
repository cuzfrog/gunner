import type { ChargeCatalog, FittingImport } from "../fitting";
import type { Ships } from "../ships";
import { PROPULSION_NONE, USER_SETTINGS_VERSION, type ProfileSettings, type PropulsionSelection, type UserSettings } from "./userSettings";
import { DEFAULT_PREFERENCES } from "./defaultPreferences";
import { decodeBase64 } from "./urlCodec";
import { FittingBasis } from "./fittingBasis";
import {
  isAutopilotMode,
  isLanguage,
  isNonNegative,
  isOptionalBoolean,
  isOptionalEwarActivation,
  isOptionalFittedHullSummary,
  isFiniteNumber,
  isOptionalFittingText,
  isOptionalNonEmptyString,
  isOptionalNonNegative,
  isOptionalProfileParamOverrides,
  isOptionalSkillLevel,
  isPositive,
  isSettingsVersion,
  isSigResolutionClass,
  stripDisplayPreferences,
} from "./validators";

const DEFAULT_TURRET_CHARGE_SIZE = 1;

export class SettingsParser {
  private readonly ships: Ships;
  private readonly fittingImport: FittingImport;
  private readonly chargeCatalog: ChargeCatalog;
  private readonly fittingBasis: FittingBasis;

  constructor(deps: { ships: Ships; fittingImport: FittingImport; chargeCatalog: ChargeCatalog }) {
    this.ships = deps.ships;
    this.fittingImport = deps.fittingImport;
    this.chargeCatalog = deps.chargeCatalog;
    this.fittingBasis = new FittingBasis(deps);
  }

  parseUserSettings(raw: string): UserSettings | null {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!this.isUserSettings(parsed)) return null;
      this.migrateEwarActivation(parsed as Record<string, unknown>);
      parsed.version = USER_SETTINGS_VERSION;
      if (parsed.attackerAmmo === undefined) {
        parsed.attackerAmmo = this.chargeCatalog.usualForChargeSize(DEFAULT_TURRET_CHARGE_SIZE);
      }
      parsed.language ??= DEFAULT_PREFERENCES.language;
      parsed.trackingUnit ??= DEFAULT_PREFERENCES.trackingUnit;
      parsed.simSpeed ??= DEFAULT_PREFERENCES.simSpeed;
      parsed.gridBrightness ??= DEFAULT_PREFERENCES.gridBrightness;
      return parsed as UserSettings;
    } catch {
      return null;
    }
  }

  parseProfiles(raw: string): Record<string, ProfileSettings> {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isProfileStorage(parsed)) return {};
      const result: Record<string, ProfileSettings> = {};
      for (const name of Object.keys(parsed)) {
        const settings = this.profileFromUnknown(parsed[name]);
        if (settings) result[name] = settings;
      }
      return result;
    } catch {
      return {};
    }
  }

  decodeUrlSettings(encoded: string): UserSettings | null {
    try {
      const settings = this.parseUserSettings(decodeBase64(encoded));
      if (!settings) return null;
      const attacker = this.fittingBasis.rebuild(settings, "attacker");
      const target = this.fittingBasis.rebuild(settings, "target");
      return { ...settings, ...attacker, ...target };
    } catch {
      return null;
    }
  }

  profileFromUnknown(value: unknown): ProfileSettings | null {
    if (!this.isProfileSettings(value)) return null;
    const withVersion = { ...value, version: USER_SETTINGS_VERSION } as Record<string, unknown>;
    this.migrateEwarActivation(withVersion);
    if (withVersion.attackerAmmo === undefined) {
      withVersion.attackerAmmo = this.chargeCatalog.usualForChargeSize(DEFAULT_TURRET_CHARGE_SIZE);
    }
    return stripDisplayPreferences(withVersion as ProfileSettings);
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
      isOptionalEwarActivation(s.attackerEwarActivation) &&
      isOptionalEwarActivation(s.targetEwarActivation) &&
      isOptionalNonEmptyString(s.attackerAmmo)
    );
  }

  private isUserSettings(value: unknown): value is Partial<UserSettings> {
    if (!this.isProfileSettings(value)) return false;
    const s = value as Record<string, unknown>;
    return (
      (s.language === undefined || isLanguage(s.language)) &&
      (s.trackingUnit === undefined || s.trackingUnit === "rad" || s.trackingUnit === "score") &&
      (s.simSpeed === undefined || isPositive(s.simSpeed)) &&
      (s.gridBrightness === undefined || isFiniteNumber(s.gridBrightness))
    );
  }
  private isOptionalPropulsionSelection(value: unknown): value is PropulsionSelection | undefined {
    return value === undefined || value === PROPULSION_NONE || this.ships.parsePropulsionId(value) !== undefined;
  }

  private migrateEwarActivation(value: Record<string, unknown>): void {
    this.migrateSideEwarActivation(value.attackerEwarActivation);
    this.migrateSideEwarActivation(value.targetEwarActivation);
  }

  private migrateSideEwarActivation(saved: unknown): void {
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return;
    const s = saved as Record<string, unknown>;
    if (s.disruptors !== undefined && Array.isArray(s.disruptors)) {
      s.disruptors = s.disruptors.map((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return item;
        const d = { ...(item as Record<string, unknown>) };
        if (d.script === "optimalRange") d.script = "Optimal Range Disruption Script";
        if (d.script === "trackingSpeed") d.script = "Tracking Speed Disruption Script";
        return d;
      });
    }
  }
}

function isProfileStorage(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
