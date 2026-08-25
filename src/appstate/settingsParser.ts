import type { ChargeCatalog, FittingImport } from "../fitting";
import type { Ships } from "../ships";
import { LEGACY_DISRUPTION_SCRIPT_NAMES } from "./legacyScriptNames";
import {
  PROPULSION_NONE,
  USER_SETTINGS_VERSION,
  type ProfileSettings as ProfileSettingsWire,
  type PropulsionSelection,
  type UserSettings,
} from "./userSettings";
import { DEFAULT_PREFERENCES } from "./defaultPreferences";
import { decodeBase64 } from "./urlCodec";
import { FittingBasis } from "./fittingBasis";
import { normalizeLegacySettings, type LegacyUserSettings } from "./settingsCompat";
import type { SettingGuards } from "./settingGuards";
import type { CombatantSettings, ShipBCombatantSettings, UserSettings as InternalUserSettings } from "./combatantSettings";
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

type UserSettingsWire = UserSettings & Partial<LegacyUserSettings>;

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
      normalizeLegacySettings(record);
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
      const shipA = this.fittingBasis.rebuild(settings, "shipA");
      const shipB = this.fittingBasis.rebuild(settings, "shipB");
      return { ...settings, ...shipA, ...shipB };
    } catch {
      return null;
    }
  }

  profileFromUnknown(value: unknown): ProfileSettingsWire | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const record = { ...value } as Record<string, unknown>;
    normalizeLegacySettings(record);
    this.migrateBoosterActivation(record);
    this.migrateEwarActivation(record);
    if (!this.isProfileSettings(record)) return null;
    record.version = USER_SETTINGS_VERSION;
    if (record.shipAAmmo === undefined) {
      record.shipAAmmo = this.chargeCatalog.usualForChargeSize(DEFAULT_TURRET_CHARGE_SIZE);
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
      isNonNegative(s.shipASpeed) &&
      this.guards.isAutopilotMode(s.shipAMode) &&
      isNonNegative(s.shipARange) &&
      isOptionalNonNegative(s.maneuverAggressivity) &&
      isNonNegative(s.shipAMass) &&
      isNonNegative(s.shipAInertia) &&
      isOptionalSkillLevel(s.shipASkillLevel) &&
      isOptionalBoolean(s.shipAOverload) &&
      isPositive(s.initialDistance) &&
      isNonNegative(s.shipBSpeed) &&
      this.guards.isAutopilotMode(s.shipBMode) &&
      isNonNegative(s.shipBRange) &&
      isNonNegative(s.shipBMass) &&
      isNonNegative(s.shipBInertia) &&
      isOptionalSkillLevel(s.shipBSkillLevel) &&
      isOptionalBoolean(s.shipBOverload) &&
      isPositive(s.shipBSig) &&
      isOptionalNonEmptyString(s.shipAHull) &&
      this.isOptionalPropulsionSelection(s.shipAPropulsion) &&
      isOptionalNonEmptyString(s.shipBHull) &&
      this.isOptionalPropulsionSelection(s.shipBPropulsion) &&
      isOptionalFittedHullSummary(s.shipAFittedHull) &&
      isOptionalFittedHullSummary(s.shipBFittedHull) &&
      isOptionalFittingText(s.shipAFitting) &&
      isOptionalFittingText(s.shipBFitting) &&
      isOptionalProfileParamOverrides(s.shipAOverrides, this.guards) &&
      isOptionalProfileParamOverrides(s.shipBOverrides, this.guards) &&
      isOptionalEwarActivation(s.shipAEwarActivation) &&
      isOptionalEwarActivation(s.shipBEwarActivation) &&
      isOptionalBoosterActivations(s.shipABoosterActivation) &&
      isOptionalBoosterActivations(s.shipBBoosterActivation) &&
      isOptionalNonEmptyString(s.shipAAmmo)
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
      (s.autoZoom === undefined || typeof s.autoZoom === "boolean") &&
      (s.zoomFactor === undefined || isPositive(s.zoomFactor)) &&
      typeof s.shipAAmmo === "string" &&
      s.shipAAmmo.length > 0
    );
  }

  private isOptionalPropulsionSelection(value: unknown): value is PropulsionSelection | undefined {
    return value === undefined || value === PROPULSION_NONE || this.ships.parsePropulsionId(value) !== undefined;
  }

  private applyUserDefaults(record: Record<string, unknown>): void {
    if (record.shipAAmmo === undefined) {
      record.shipAAmmo = this.chargeCatalog.usualForChargeSize(DEFAULT_TURRET_CHARGE_SIZE);
    }
    record.language ??= DEFAULT_PREFERENCES.language;
    record.trackingUnit ??= DEFAULT_PREFERENCES.trackingUnit;
    record.simSpeed ??= DEFAULT_PREFERENCES.simSpeed;
    record.gridBrightness ??= DEFAULT_PREFERENCES.gridBrightness;
    record.autoZoom ??= DEFAULT_PREFERENCES.autoZoom;
    record.zoomFactor ??= DEFAULT_PREFERENCES.zoomFactor;
  }

  private migrateBoosterActivation(value: Record<string, unknown>): void {
    this.migrateSideBoosterActivation(value, "shipABoosterActivation");
    this.migrateSideBoosterActivation(value, "shipBBoosterActivation");
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
    this.migrateSideEwarActivation(value.shipAEwarActivation, this.sideOverload(value, "shipA"));
    this.migrateSideEwarActivation(value.shipBEwarActivation, this.sideOverload(value, "shipB"));
  }

  private sideOverload(value: Record<string, unknown>, side: "shipA" | "shipB"): boolean {
    const key = side === "shipA" ? "shipAOverload" : "shipBOverload";
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
  return "shipA" in value;
}

function fromWireSettings(wire: UserSettingsWire): InternalUserSettings {
  const gridBrightness = wire.gridBrightness ?? DEFAULT_PREFERENCES.gridBrightness;
  const autoZoom = wire.autoZoom ?? true;
  const zoomFactor = wire.zoomFactor ?? 1;
  return {
    version: wire.version,
    language: wire.language,
    simSpeed: wire.simSpeed,
    trackingUnit: wire.trackingUnit,
    gridBrightness,
    autoZoom,
    zoomFactor,
    display: {
      language: wire.language,
      trackingUnit: wire.trackingUnit,
      simSpeed: wire.simSpeed,
      gridBrightness,
      autoZoom,
      zoomFactor,
    },
    maneuverAggressivity: wire.maneuverAggressivity,
    shipA: {
      speed: wire.shipASpeed,
      mode: wire.shipAMode,
      range: wire.shipARange,
      mass: wire.shipAMass,
      inertia: wire.shipAInertia,
      skillLevel: wire.shipASkillLevel,
      overload: wire.shipAOverload,
      hull: wire.shipAHull,
      propulsion: wire.shipAPropulsion,
      fitting: wire.shipAFitting,
      overrides: wire.shipAOverrides,
      fittedHull: wire.shipAFittedHull,
      ewarActivation: wire.shipAEwarActivation,
      boosterActivation: wire.shipABoosterActivation,
    },
    shipB: {
      speed: wire.shipBSpeed,
      mode: wire.shipBMode,
      range: wire.shipBRange,
      mass: wire.shipBMass,
      inertia: wire.shipBInertia,
      skillLevel: wire.shipBSkillLevel,
      overload: wire.shipBOverload,
      hull: wire.shipBHull,
      propulsion: wire.shipBPropulsion,
      fitting: wire.shipBFitting,
      overrides: wire.shipBOverrides,
      fittedHull: wire.shipBFittedHull,
      ewarActivation: wire.shipBEwarActivation,
      boosterActivation: wire.shipBBoosterActivation,
      sig: wire.shipBSig,
    },
    tracking: wire.tracking,
    sigRes: wire.sigRes,
    optimal: wire.optimal,
    falloff: wire.falloff,
    initialDistance: wire.initialDistance,
    shipAAmmo: wire.shipAAmmo,
  };
}

function toWireSettings(internal: InternalUserSettings): UserSettingsWire {
  const wire: UserSettingsWire = {
    version: internal.version,
    language: internal.language,
    trackingUnit: internal.trackingUnit,
    simSpeed: internal.simSpeed,
    gridBrightness: internal.gridBrightness,
    autoZoom: internal.display.autoZoom,
    zoomFactor: internal.display.zoomFactor,
    tracking: internal.tracking,
    sigRes: internal.sigRes,
    optimal: internal.optimal,
    falloff: internal.falloff,
    shipASpeed: internal.shipA.speed,
    shipAMode: internal.shipA.mode,
    shipARange: internal.shipA.range,
    shipAMass: internal.shipA.mass,
    shipAInertia: internal.shipA.inertia,
    initialDistance: internal.initialDistance,
    shipBSpeed: internal.shipB.speed,
    shipBMode: internal.shipB.mode,
    shipBRange: internal.shipB.range,
    shipBMass: internal.shipB.mass,
    shipBInertia: internal.shipB.inertia,
    shipBSig: internal.shipB.sig,
    shipAAmmo: internal.shipAAmmo,
  };
  if (internal.maneuverAggressivity !== undefined) wire.maneuverAggressivity = internal.maneuverAggressivity;
  setOptionalShipAFields(wire, internal.shipA);
  setOptionalShipBFields(wire, internal.shipB);
  return wire;
}

function setOptionalShipAFields(wire: UserSettingsWire, combatant: CombatantSettings): void {
  if (combatant.skillLevel !== undefined) wire.shipASkillLevel = combatant.skillLevel;
  if (combatant.overload !== undefined) wire.shipAOverload = combatant.overload;
  if (combatant.hull !== undefined) wire.shipAHull = combatant.hull;
  if (combatant.propulsion !== undefined) wire.shipAPropulsion = combatant.propulsion;
  if (combatant.fitting !== undefined) wire.shipAFitting = combatant.fitting;
  if (combatant.overrides !== undefined) wire.shipAOverrides = combatant.overrides;
  if (combatant.fittedHull !== undefined) wire.shipAFittedHull = combatant.fittedHull;
  if (combatant.ewarActivation !== undefined) wire.shipAEwarActivation = combatant.ewarActivation;
  if (combatant.boosterActivation !== undefined) wire.shipABoosterActivation = combatant.boosterActivation;
}

function setOptionalShipBFields(wire: UserSettingsWire, combatant: CombatantSettings): void {
  if (combatant.skillLevel !== undefined) wire.shipBSkillLevel = combatant.skillLevel;
  if (combatant.overload !== undefined) wire.shipBOverload = combatant.overload;
  if (combatant.hull !== undefined) wire.shipBHull = combatant.hull;
  if (combatant.propulsion !== undefined) wire.shipBPropulsion = combatant.propulsion;
  if (combatant.fitting !== undefined) wire.shipBFitting = combatant.fitting;
  if (combatant.overrides !== undefined) wire.shipBOverrides = combatant.overrides;
  if (combatant.fittedHull !== undefined) wire.shipBFittedHull = combatant.fittedHull;
  if (combatant.ewarActivation !== undefined) wire.shipBEwarActivation = combatant.ewarActivation;
  if (combatant.boosterActivation !== undefined) wire.shipBBoosterActivation = combatant.boosterActivation;
}
