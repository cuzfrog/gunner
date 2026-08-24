import type { ChargeCatalog, FittingImport } from "../fitting";
import type { Ships } from "../ships";
import { LEGACY_DISRUPTION_SCRIPT_NAMES } from "./legacyScriptNames";
import {
  PROPULSION_NONE,
  USER_SETTINGS_VERSION,
  type ProfileSettings as ProfileSettingsWire,
  type PropulsionSelection,
  type UserSettings as UserSettingsWire,
} from "./userSettings";
import { DEFAULT_PREFERENCES } from "./defaultPreferences";
import { decodeBase64 } from "./urlCodec";
import { FittingBasis } from "./fittingBasis";
import type { SettingGuards } from "./settingGuards";
import type { CombatantSettings, TargetCombatantSettings, UserSettings as InternalUserSettings } from "./combatantSettings";
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
  private readonly guards: SettingGuards;

  constructor(deps: { ships: Ships; fittingImport: FittingImport; chargeCatalog: ChargeCatalog; settingGuards: SettingGuards }) {
    this.ships = deps.ships;
    this.fittingImport = deps.fittingImport;
    this.chargeCatalog = deps.chargeCatalog;
    this.guards = deps.settingGuards;
    this.fittingBasis = new FittingBasis(deps);
  }

  parseUserSettings(raw: string): UserSettingsWire | null {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      const record = parsed as Record<string, unknown>;
      this.migrateBoosterActivation(record);
      this.migrateEwarActivation(record);
      this.applyUserDefaults(record);
      if (!this.isUserSettings(record)) return null;
      record.version = USER_SETTINGS_VERSION;
      return toWireSettings(fromWireSettings(record));
    } catch {
      return null;
    }
  }

  parseProfiles(raw: string): Record<string, ProfileSettingsWire> {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isProfileStorage(parsed)) return {};
      const result: Record<string, ProfileSettingsWire> = {};
      for (const name of Object.keys(parsed)) {
        const settings = this.profileFromUnknown(parsed[name]);
        if (settings) result[name] = settings;
      }
      return result;
    } catch {
      return {};
    }
  }

  decodeUrlSettings(encoded: string): UserSettingsWire | null {
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

  profileFromUnknown(value: unknown): ProfileSettingsWire | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const record = { ...value } as Record<string, unknown>;
    this.migrateBoosterActivation(record);
    this.migrateEwarActivation(record);
    if (!this.isProfileSettings(record)) return null;
    record.version = USER_SETTINGS_VERSION;
    if (record.attackerAmmo === undefined) {
      record.attackerAmmo = this.chargeCatalog.usualForChargeSize(DEFAULT_TURRET_CHARGE_SIZE);
    }
    return stripDisplayPreferences(record as ProfileSettingsWire);
  }

  serialize(settings: UserSettingsWire | ProfileSettingsWire | InternalUserSettings): string {
    if (isInternalUserSettings(settings)) {
      return JSON.stringify(toWireSettings(settings));
    }
    return JSON.stringify(settings);
  }

  private isProfileSettings(value: unknown): value is ProfileSettingsWire {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const s = value as Record<string, unknown>;
    return (
      isSettingsVersion(s.version) &&
      isNonNegative(s.tracking) &&
      this.guards.isSigResolutionClass(s.sigRes) &&
      isNonNegative(s.optimal) &&
      isNonNegative(s.falloff) &&
      isNonNegative(s.attackerSpeed) &&
      this.guards.isAutopilotMode(s.attackerMode) &&
      isNonNegative(s.attackerRange) &&
      isOptionalNonNegative(s.maneuverAggressivity) &&
      isNonNegative(s.attackerMass) &&
      isNonNegative(s.attackerInertia) &&
      isOptionalSkillLevel(s.attackerSkillLevel) &&
      isOptionalBoolean(s.attackerOverload) &&
      isPositive(s.initialDistance) &&
      isNonNegative(s.targetSpeed) &&
      this.guards.isAutopilotMode(s.targetMode) &&
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
      isOptionalProfileParamOverrides(s.attackerOverrides, this.guards) &&
      isOptionalProfileParamOverrides(s.targetOverrides, this.guards) &&
      isOptionalEwarActivation(s.attackerEwarActivation) &&
      isOptionalEwarActivation(s.targetEwarActivation) &&
      isOptionalBoosterActivations(s.attackerBoosterActivation) &&
      isOptionalBoosterActivations(s.targetBoosterActivation) &&
      isOptionalNonEmptyString(s.attackerAmmo)
    );
  }

  private isUserSettings(value: unknown): value is UserSettingsWire {
    if (!this.isProfileSettings(value)) return false;
    const s = value as Record<string, unknown>;
    return (
      isLanguage(s.language) &&
      (s.trackingUnit === "rad" || s.trackingUnit === "score") &&
      isPositive(s.simSpeed) &&
      isFiniteNumber(s.gridBrightness) &&
      typeof s.attackerAmmo === "string" &&
      s.attackerAmmo.length > 0
    );
  }

  private isOptionalPropulsionSelection(value: unknown): value is PropulsionSelection | undefined {
    return value === undefined || value === PROPULSION_NONE || this.ships.parsePropulsionId(value) !== undefined;
  }

  private applyUserDefaults(record: Record<string, unknown>): void {
    if (record.attackerAmmo === undefined) {
      record.attackerAmmo = this.chargeCatalog.usualForChargeSize(DEFAULT_TURRET_CHARGE_SIZE);
    }
    record.language ??= DEFAULT_PREFERENCES.language;
    record.trackingUnit ??= DEFAULT_PREFERENCES.trackingUnit;
    record.simSpeed ??= DEFAULT_PREFERENCES.simSpeed;
    record.gridBrightness ??= DEFAULT_PREFERENCES.gridBrightness;
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

function isInternalUserSettings(value: UserSettingsWire | ProfileSettingsWire | InternalUserSettings): value is InternalUserSettings {
  return "attacker" in value;
}

function fromWireSettings(wire: UserSettingsWire): InternalUserSettings {
  const gridBrightness = wire.gridBrightness ?? DEFAULT_PREFERENCES.gridBrightness;
  return {
    version: wire.version,
    language: wire.language,
    simSpeed: wire.simSpeed,
    trackingUnit: wire.trackingUnit,
    gridBrightness,
    display: {
      language: wire.language,
      trackingUnit: wire.trackingUnit,
      simSpeed: wire.simSpeed,
      gridBrightness,
    },
    maneuverAggressivity: wire.maneuverAggressivity,
    attacker: {
      speed: wire.attackerSpeed,
      mode: wire.attackerMode,
      range: wire.attackerRange,
      mass: wire.attackerMass,
      inertia: wire.attackerInertia,
      skillLevel: wire.attackerSkillLevel,
      overload: wire.attackerOverload,
      hull: wire.attackerHull,
      propulsion: wire.attackerPropulsion,
      fitting: wire.attackerFitting,
      overrides: wire.attackerOverrides,
      fittedHull: wire.attackerFittedHull,
      ewarActivation: wire.attackerEwarActivation,
      boosterActivation: wire.attackerBoosterActivation,
    },
    target: {
      speed: wire.targetSpeed,
      mode: wire.targetMode,
      range: wire.targetRange,
      mass: wire.targetMass,
      inertia: wire.targetInertia,
      skillLevel: wire.targetSkillLevel,
      overload: wire.targetOverload,
      hull: wire.targetHull,
      propulsion: wire.targetPropulsion,
      fitting: wire.targetFitting,
      overrides: wire.targetOverrides,
      fittedHull: wire.targetFittedHull,
      ewarActivation: wire.targetEwarActivation,
      boosterActivation: wire.targetBoosterActivation,
      sig: wire.targetSig,
    },
    tracking: wire.tracking,
    sigRes: wire.sigRes,
    optimal: wire.optimal,
    falloff: wire.falloff,
    initialDistance: wire.initialDistance,
    attackerAmmo: wire.attackerAmmo,
  };
}

function toWireSettings(internal: InternalUserSettings): UserSettingsWire {
  const wire: UserSettingsWire = {
    version: internal.version,
    language: internal.language,
    trackingUnit: internal.trackingUnit,
    simSpeed: internal.simSpeed,
    gridBrightness: internal.gridBrightness,
    tracking: internal.tracking,
    sigRes: internal.sigRes,
    optimal: internal.optimal,
    falloff: internal.falloff,
    attackerSpeed: internal.attacker.speed,
    attackerMode: internal.attacker.mode,
    attackerRange: internal.attacker.range,
    attackerMass: internal.attacker.mass,
    attackerInertia: internal.attacker.inertia,
    initialDistance: internal.initialDistance,
    targetSpeed: internal.target.speed,
    targetMode: internal.target.mode,
    targetRange: internal.target.range,
    targetMass: internal.target.mass,
    targetInertia: internal.target.inertia,
    targetSig: internal.target.sig,
    attackerAmmo: internal.attackerAmmo,
  };
  if (internal.maneuverAggressivity !== undefined) wire.maneuverAggressivity = internal.maneuverAggressivity;
  setOptionalAttackerFields(wire, internal.attacker);
  setOptionalTargetFields(wire, internal.target);
  return wire;
}

function setOptionalAttackerFields(wire: UserSettingsWire, combatant: CombatantSettings): void {
  if (combatant.skillLevel !== undefined) wire.attackerSkillLevel = combatant.skillLevel;
  if (combatant.overload !== undefined) wire.attackerOverload = combatant.overload;
  if (combatant.hull !== undefined) wire.attackerHull = combatant.hull;
  if (combatant.propulsion !== undefined) wire.attackerPropulsion = combatant.propulsion;
  if (combatant.fitting !== undefined) wire.attackerFitting = combatant.fitting;
  if (combatant.overrides !== undefined) wire.attackerOverrides = combatant.overrides;
  if (combatant.fittedHull !== undefined) wire.attackerFittedHull = combatant.fittedHull;
  if (combatant.ewarActivation !== undefined) wire.attackerEwarActivation = combatant.ewarActivation;
  if (combatant.boosterActivation !== undefined) wire.attackerBoosterActivation = combatant.boosterActivation;
}

function setOptionalTargetFields(wire: UserSettingsWire, combatant: CombatantSettings): void {
  if (combatant.skillLevel !== undefined) wire.targetSkillLevel = combatant.skillLevel;
  if (combatant.overload !== undefined) wire.targetOverload = combatant.overload;
  if (combatant.hull !== undefined) wire.targetHull = combatant.hull;
  if (combatant.propulsion !== undefined) wire.targetPropulsion = combatant.propulsion;
  if (combatant.fitting !== undefined) wire.targetFitting = combatant.fitting;
  if (combatant.overrides !== undefined) wire.targetOverrides = combatant.overrides;
  if (combatant.fittedHull !== undefined) wire.targetFittedHull = combatant.fittedHull;
  if (combatant.ewarActivation !== undefined) wire.targetEwarActivation = combatant.ewarActivation;
  if (combatant.boosterActivation !== undefined) wire.targetBoosterActivation = combatant.boosterActivation;
}
