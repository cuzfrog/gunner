import { isAutopilotMode, isSigResolutionClass } from "../sim";
import type { ChargeCatalog, FittingImport } from "../fitting";
import type { Ships } from "../ships";
import { LEGACY_DISRUPTION_SCRIPT_NAMES } from "./legacyScriptNames";
import { PROPULSION_NONE, USER_SETTINGS_VERSION, type ProfileSettings, type PropulsionSelection, type UserSettings } from "./userSettings";
import { DEFAULT_PREFERENCES } from "./defaultPreferences";
import { decodeBase64 } from "./urlCodec";
import { FittingBasis } from "./fittingBasis";
import {
  isLanguage,
  isNonNegative,
  isOptionalBoosterActivations,
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
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      const record = parsed as Record<string, unknown>;
      this.migrateBoosterActivation(record);
      this.migrateEwarActivation(record);
      if (!this.isUserSettings(record)) return null;
      record.version = USER_SETTINGS_VERSION;
      if (record.attackerAmmo === undefined) {
        record.attackerAmmo = this.chargeCatalog.usualForChargeSize(DEFAULT_TURRET_CHARGE_SIZE);
      }
      record.language ??= DEFAULT_PREFERENCES.language;
      record.trackingUnit ??= DEFAULT_PREFERENCES.trackingUnit;
      record.simSpeed ??= DEFAULT_PREFERENCES.simSpeed;
      record.gridBrightness ??= DEFAULT_PREFERENCES.gridBrightness;
      return record as UserSettings;
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
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const record = { ...value } as Record<string, unknown>;
    this.migrateBoosterActivation(record);
    this.migrateEwarActivation(record);
    if (!this.isProfileSettings(record)) return null;
    record.version = USER_SETTINGS_VERSION;
    if (record.attackerAmmo === undefined) {
      record.attackerAmmo = this.chargeCatalog.usualForChargeSize(DEFAULT_TURRET_CHARGE_SIZE);
    }
    return stripDisplayPreferences(record as ProfileSettings);
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
      isOptionalBoosterActivations(s.attackerBoosterActivation) &&
      isOptionalBoosterActivations(s.targetBoosterActivation) &&
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

  private migrateBoosterActivation(value: Record<string, unknown>): void {
    this.migrateSideBoosterActivation(value, "attackerBoosterActivation");
    this.migrateSideBoosterActivation(value, "targetBoosterActivation");
  }

  private migrateSideBoosterActivation(value: Record<string, unknown>, key: string): void {
    const saved = value[key];
    if (!Array.isArray(saved)) return;
    value[key] = saved.map((item) => this.migrateBoosterEntry(item));
  }

  private migrateBoosterEntry(item: unknown): unknown {
    if (typeof item === "boolean") return { active: item, script: "none" };
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    const record = { ...(item as Record<string, unknown>) };
    if (typeof record.active !== "boolean") return item;
    if (record.script === "") record.script = "none";
    return record;
  }

  private migrateEwarActivation(value: Record<string, unknown>): void {
    this.migrateSideEwarActivation(value.attackerEwarActivation, this.sideOverload(value, "attacker"));
    this.migrateSideEwarActivation(value.targetEwarActivation, this.sideOverload(value, "target"));
  }

  private sideOverload(value: Record<string, unknown>, side: "attacker" | "target"): boolean {
    const key = side === "attacker" ? "attackerOverload" : "targetOverload";
    if (value[key] === true) return true;
    if (value[key] === false) return false;
    return true;
  }

  private migrateSideEwarActivation(saved: unknown, defaultOverload: boolean): void {
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return;
    const s = saved as Record<string, unknown>;
    if (s.webs !== undefined && Array.isArray(s.webs)) {
      s.webs = s.webs.map((item) => this.migrateToggleEntry(item, defaultOverload));
    }
    if (s.grapplers !== undefined && Array.isArray(s.grapplers)) {
      s.grapplers = s.grapplers.map((item) => this.migrateToggleEntry(item, defaultOverload));
    }
    if (s.disruptors !== undefined && Array.isArray(s.disruptors)) {
      s.disruptors = s.disruptors.map((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return item;
        const d = { ...(item as Record<string, unknown>) };
        if (typeof d.script === "string") d.script = LEGACY_DISRUPTION_SCRIPT_NAMES[d.script] ?? d.script;
        if (typeof d.active === "boolean") d.overloaded ??= defaultOverload;
        return d;
      });
    }
    if (s.scramblers !== undefined && Array.isArray(s.scramblers)) {
      s.scramblers = s.scramblers.map((item) => this.migrateToggleEntry(item, defaultOverload));
    }
  }

  private migrateToggleEntry(item: unknown, defaultOverload: boolean): unknown {
    if (typeof item === "boolean") return { active: item, overloaded: defaultOverload };
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    const record = item as Record<string, unknown>;
    if (typeof record.active !== "boolean") return item;
    record.overloaded ??= defaultOverload;
    return record;
  }
}

function isProfileStorage(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
