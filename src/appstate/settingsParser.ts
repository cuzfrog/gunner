import type { ChargeCatalog, FittingImport } from "../fitting";
import type { ShipId } from "../gamedata/ids";
import type { ItemNameResolver } from "../gamedata/itemNames";
import type { Ships } from "../ships";
import {
  PROPULSION_NONE,
  USER_SETTINGS_VERSION,
  type ProfileSettings as ProfileSettingsWire,
  type PropulsionSelection,
  type UserSettings,
} from "./userSettings";
import { clampManeuverAggressivity } from "../sim";
import { DEFAULT_PREFERENCES } from "./defaultPreferences";
import { decodeBase64 } from "./urlCodec";
import { FittingBasis } from "./fittingBasis";
import {
  normalizeLegacySettings,
  resolveAmmoId,
  resolveBoosterScript,
  resolveDisruptionScript,
  resolveHullId,
  type LegacyUserSettings,
} from "./settingsCompat";
import { toCombatantSettings, type CombatantSettings, type InternalUserSettings } from "./combatantSettings";
import type { SettingGuards } from "./settingGuards";
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
  isOptionalPositive,
  isOptionalProfileParamOverrides,
  isOptionalSkillLevel,
  isPositive,
  isSettingsVersion,
  stripDisplayPreferences,
} from "./validators";

type UserSettingsWire = UserSettings & Partial<LegacyUserSettings>;

const DEFAULT_TURRET_CHARGE_SIZE = 1;
const AGGRESSIVITY_DEFAULT = 1;

export class SettingsParser {
  private readonly ships: Ships;
  private readonly fittingImport: FittingImport;
  private readonly chargeCatalog: ChargeCatalog;
  private readonly itemNameResolver: ItemNameResolver;
  private readonly fittingBasis: FittingBasis;
  private readonly guards: SettingGuards;

  constructor(deps: { ships: Ships; fittingImport: FittingImport; chargeCatalog: ChargeCatalog; itemNameResolver: ItemNameResolver; settingGuards: SettingGuards }) {
    this.ships = deps.ships;
    this.fittingImport = deps.fittingImport;
    this.chargeCatalog = deps.chargeCatalog;
    this.itemNameResolver = deps.itemNameResolver;
    this.guards = deps.settingGuards;
    this.fittingBasis = new FittingBasis(deps);
  }

  parseUserSettings(raw: string): UserSettingsWire | null {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed)) return null;
      const record = parsed;
      normalizeLegacySettings(record);
      this.normalizeAndDefaultAggressivity(record);
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
    if (!isRecord(value)) return null;
    const record: Record<string, unknown> = { ...value };
    normalizeLegacySettings(record);
    this.normalizeAndDefaultAggressivity(record);
    this.migrateBoosterActivation(record);
    this.migrateEwarActivation(record);
    this.applyUserDefaults(record);
    if (!this.isProfileSettings(record)) return null;
    record.version = USER_SETTINGS_VERSION;
    return stripDisplayPreferences(record as ProfileSettingsWire);
  }

  serialize(settings: UserSettingsWire | ProfileSettingsWire | InternalUserSettings): string {
    if (isInternalUserSettings(settings)) {
      return JSON.stringify(toWireSettings(settings));
    }
    return JSON.stringify(settings);
  }

  private isProfileSettings(value: unknown): value is UserSettingsWire {
    if (!isRecord(value)) return false;
    const s = value;
    return (
      isSettingsVersion(s.version) &&
      isNonNegative(s.shipATracking) &&
      this.guards.isSigResolutionClass(s.shipASigRes) &&
      isNonNegative(s.shipAOptimal) &&
      isNonNegative(s.shipAFalloff) &&
      isNonNegative(s.shipBTracking) &&
      this.guards.isSigResolutionClass(s.shipBSigRes) &&
      isNonNegative(s.shipBOptimal) &&
      isNonNegative(s.shipBFalloff) &&
      isPositive(s.initialDistance) &&
      isOptionalNonEmptyString(s.shipAAmmo) &&
      isOptionalNonEmptyString(s.shipBAmmo) &&
      this.isSideCombatantValid(s, "shipA") &&
      this.isSideCombatantValid(s, "shipB")
    );
  }

  private isUserSettings(value: unknown): value is UserSettingsWire {
    if (!this.isProfileSettings(value)) return false;
    return (
      isLanguage(value.language) &&
      isTrackingUnitValue(value.shipATrackingUnit) &&
      isTrackingUnitValue(value.shipBTrackingUnit) &&
      isPositive(value.simSpeed) &&
      isFiniteNumber(value.gridBrightness) &&
      (value.autoZoom === undefined || typeof value.autoZoom === "boolean") &&
      (value.zoomFactor === undefined || isPositive(value.zoomFactor)) &&
      typeof value.shipAAmmo === "string" &&
      value.shipAAmmo.length > 0 &&
      typeof value.shipBAmmo === "string" &&
      value.shipBAmmo.length > 0
    );
  }

  private isSideCombatantValid(s: Record<string, unknown>, side: "shipA" | "shipB"): boolean {
    const p = side;
    return (
      isNonNegative(s[`${p}Speed`]) &&
      this.guards.isAutopilotMode(s[`${p}Mode`]) &&
      isNonNegative(s[`${p}Range`]) &&
      isNonNegative(s[`${p}Mass`]) &&
      isNonNegative(s[`${p}Inertia`]) &&
      isOptionalNonNegative(s[`${p}Aggressivity`]) &&
      isOptionalSkillLevel(s[`${p}SkillLevel`]) &&
      isOptionalBoolean(s[`${p}Overload`]) &&
      isOptionalNonEmptyString(s[`${p}HullId`]) &&
      this.isOptionalPropulsionSelection(s[`${p}Propulsion`]) &&
      isOptionalFittingText(s[`${p}Fitting`]) &&
      isOptionalProfileParamOverrides(s[`${p}Overrides`], this.guards) &&
      isOptionalFittedHullSummary(s[`${p}FittedHull`]) &&
      isOptionalEwarActivation(s[`${p}EwarActivation`]) &&
      isOptionalBoosterActivations(s[`${p}BoosterActivation`]) &&
      (side === "shipA" ? isOptionalPositive(s[`${p}Sig`]) : isPositive(s[`${p}Sig`]))
    );
  }

  private isOptionalPropulsionSelection(value: unknown): value is PropulsionSelection | undefined {
    return value === undefined || value === PROPULSION_NONE || this.ships.parsePropulsionId(value) !== undefined;
  }

  private migrateLegacyIdentity(record: Record<string, unknown>, side: "shipA" | "shipB"): void {
    const hullKey = `${side}Hull`;
    const hullIdKey = `${side}HullId`;
    const ammoKey = `${side}Ammo`;

    const hullIdValue = record[hullIdKey];
    const hullValue = record[hullKey];
    let resolvedHull: ShipId | undefined;
    if (typeof hullIdValue === "string" && hullIdValue.length > 0) resolvedHull = resolveHullId(hullIdValue, this.ships);
    if (resolvedHull === undefined && typeof hullValue === "string" && hullValue.length > 0) resolvedHull = resolveHullId(hullValue, this.ships);
    if (resolvedHull) record[hullIdKey] = resolvedHull;
    else if (typeof hullIdValue === "string" && hullIdValue.length > 0) delete record[hullIdKey];
    delete record[hullKey];

    const ammoValue = record[ammoKey];
    if (typeof ammoValue === "string") {
      record[ammoKey] = resolveAmmoId(ammoValue, this.chargeCatalog) ?? this.chargeCatalog.usualForChargeSize(DEFAULT_TURRET_CHARGE_SIZE);
    }
  }

  private applyUserDefaults(record: Record<string, unknown>): void {
    this.migrateLegacyIdentity(record, "shipA");
    this.migrateLegacyIdentity(record, "shipB");
    if (record.shipAAmmo === undefined) {
      record.shipAAmmo = this.chargeCatalog.usualForChargeSize(DEFAULT_TURRET_CHARGE_SIZE);
    }
    if (record.shipBAmmo === undefined) {
      record.shipBAmmo = this.chargeCatalog.usualForChargeSize(DEFAULT_TURRET_CHARGE_SIZE);
    }
    record.shipATracking ??= 0;
    record.shipASigRes ??= "S";
    record.shipAOptimal ??= 0;
    record.shipAFalloff ??= 0;
    record.shipBTracking ??= 0;
    record.shipBSigRes ??= "S";
    record.shipBOptimal ??= 0;
    record.shipBFalloff ??= 0;
    record.language ??= DEFAULT_PREFERENCES.language;
    this.migrateTrackingUnit(record);
    record.simSpeed ??= DEFAULT_PREFERENCES.simSpeed;
    record.gridBrightness ??= DEFAULT_PREFERENCES.gridBrightness;
    record.autoZoom ??= DEFAULT_PREFERENCES.autoZoom;
    record.zoomFactor ??= DEFAULT_PREFERENCES.zoomFactor;
  }

  private normalizeAndDefaultAggressivity(record: Record<string, unknown>): void {
    if (record.shipAAggressivity === undefined && isFiniteNumber(record.maneuverAggressivity)) {
      record.shipAAggressivity = clampManeuverAggressivity(record.maneuverAggressivity);
    }
    record.shipAAggressivity = clampManeuverAggressivity(isFiniteNumber(record.shipAAggressivity) ? record.shipAAggressivity : AGGRESSIVITY_DEFAULT);
    record.shipBAggressivity = clampManeuverAggressivity(isFiniteNumber(record.shipBAggressivity) ? record.shipBAggressivity : AGGRESSIVITY_DEFAULT);
    delete record.maneuverAggressivity;
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
    if (!isRecord(item)) return item;
    const record = { ...item };
    const active = typeof record.active === "boolean" ? record.active : false;
    if (record.script === undefined) return { active, script: "none" };
    if (typeof record.script !== "string") return item;
    return { active, script: resolveBoosterScript(record.script, this.itemNameResolver) };
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
    if (!isRecord(saved)) return;
    const s = saved;
    if (s.webs !== undefined && Array.isArray(s.webs)) {
      s.webs = s.webs.map((item) => this.migrateToggleEntry(item, defaultOverload));
    }
    if (s.grapplers !== undefined && Array.isArray(s.grapplers)) {
      s.grapplers = s.grapplers.map((item) => this.migrateToggleEntry(item, defaultOverload));
    }
    if (s.disruptors !== undefined && Array.isArray(s.disruptors)) {
      s.disruptors = s.disruptors.map((item) => this.migrateDisruptorEntry(item, defaultOverload));
    }
    if (s.scramblers !== undefined && Array.isArray(s.scramblers)) {
      s.scramblers = s.scramblers.map((item) => this.migrateToggleEntry(item, defaultOverload));
    }
  }

  private migrateDisruptorEntry(item: unknown, defaultOverload: boolean): unknown {
    if (typeof item === "boolean") return { active: item, overloaded: defaultOverload, script: "none" };
    if (!isRecord(item)) return item;
    const d = { ...item };
    const active = typeof d.active === "boolean" ? d.active : false;
    const overloaded = typeof d.overloaded === "boolean" ? d.overloaded : defaultOverload;
    if (d.script === undefined) return { active, overloaded, script: "none" };
    if (typeof d.script !== "string") return item;
    return { active, overloaded, script: resolveDisruptionScript(d.script, this.itemNameResolver) };
  }

  private migrateToggleEntry(item: unknown, defaultOverload: boolean): unknown {
    if (typeof item === "boolean") return { active: item, overloaded: defaultOverload };
    if (!isRecord(item)) return item;
    if (typeof item.active !== "boolean") return item;
    item.overloaded ??= defaultOverload;
    return item;
  }

  private migrateTrackingUnit(record: Record<string, unknown>): void {
    if (isTrackingUnitValue(record.trackingUnit)) {
      record.shipATrackingUnit ??= record.trackingUnit;
      record.shipBTrackingUnit ??= record.trackingUnit;
    }
    delete record.trackingUnit;
    record.shipATrackingUnit = isTrackingUnitValue(record.shipATrackingUnit) ? record.shipATrackingUnit : DEFAULT_PREFERENCES.shipATrackingUnit;
    record.shipBTrackingUnit = isTrackingUnitValue(record.shipBTrackingUnit) ? record.shipBTrackingUnit : DEFAULT_PREFERENCES.shipBTrackingUnit;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isTrackingUnitValue(value: unknown): value is "rad" | "score" {
  return value === "rad" || value === "score";
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
    shipATrackingUnit: wire.shipATrackingUnit,
    shipBTrackingUnit: wire.shipBTrackingUnit,
    gridBrightness,
    autoZoom,
    zoomFactor,
    display: {
      language: wire.language,
      shipATrackingUnit: wire.shipATrackingUnit,
      shipBTrackingUnit: wire.shipBTrackingUnit,
      simSpeed: wire.simSpeed,
      gridBrightness,
      autoZoom,
      zoomFactor,
    },
    shipA: toCombatantSettings(wire, "shipA"),
    shipB: toCombatantSettings(wire, "shipB"),
    initialDistance: wire.initialDistance,
  };
}

function toWireSettings(internal: InternalUserSettings): UserSettingsWire {
  const wire: UserSettingsWire = {
    version: internal.version,
    language: internal.language,
    shipATrackingUnit: internal.shipATrackingUnit,
    shipBTrackingUnit: internal.shipBTrackingUnit,
    simSpeed: internal.simSpeed,
    gridBrightness: internal.gridBrightness,
    autoZoom: internal.display.autoZoom,
    zoomFactor: internal.display.zoomFactor,
    initialDistance: internal.initialDistance,
    shipAAmmo: internal.shipA.ammo,
    shipBAmmo: internal.shipB.ammo,
    shipATracking: internal.shipA.tracking,
    shipASigRes: internal.shipA.sigRes,
    shipAOptimal: internal.shipA.optimal,
    shipAFalloff: internal.shipA.falloff,
    shipBTracking: internal.shipB.tracking,
    shipBSigRes: internal.shipB.sigRes,
    shipBOptimal: internal.shipB.optimal,
    shipBFalloff: internal.shipB.falloff,
    shipASpeed: internal.shipA.speed,
    shipAMode: internal.shipA.mode,
    shipARange: internal.shipA.range,
    shipAAggressivity: internal.shipA.aggressivity,
    shipAMass: internal.shipA.mass,
    shipAInertia: internal.shipA.inertia,
    shipBSpeed: internal.shipB.speed,
    shipBMode: internal.shipB.mode,
    shipBRange: internal.shipB.range,
    shipBAggressivity: internal.shipB.aggressivity,
    shipBMass: internal.shipB.mass,
    shipBInertia: internal.shipB.inertia,
    shipBSig: internal.shipB.sig ?? 1,
  };
  setOptionalShipFields(wire, internal.shipA, "shipA");
  setOptionalShipFields(wire, internal.shipB, "shipB");
  return wire;
}

function setOptionalShipFields(wire: UserSettingsWire, combatant: CombatantSettings, side: "shipA" | "shipB"): void {
  const p = side;
  if (combatant.skillLevel !== undefined) wire[`${p}SkillLevel` as const] = combatant.skillLevel;
  if (combatant.overload !== undefined) wire[`${p}Overload` as const] = combatant.overload;
  if (combatant.hull !== undefined) wire[`${p}HullId` as const] = combatant.hull;
  if (combatant.propulsion !== undefined) wire[`${p}Propulsion` as const] = combatant.propulsion;
  if (combatant.fitting !== undefined) wire[`${p}Fitting` as const] = combatant.fitting;
  if (combatant.overrides !== undefined) wire[`${p}Overrides` as const] = combatant.overrides;
  if (combatant.fittedHull !== undefined) wire[`${p}FittedHull` as const] = combatant.fittedHull;
  if (combatant.ewarActivation !== undefined) wire[`${p}EwarActivation` as const] = combatant.ewarActivation;
  if (combatant.boosterActivation !== undefined) wire[`${p}BoosterActivation` as const] = combatant.boosterActivation;
  if (combatant.sig !== undefined && side === "shipA") wire.shipASig = combatant.sig;
}
