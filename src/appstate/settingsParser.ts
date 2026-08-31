import type { ChargeCatalog, FittingImport, MissileCatalog } from "../fitting";
import type { ShipId } from "../gamedata/ids";
import type { ItemNameResolver } from "../gamedata/itemNames";
import type { Ships } from "../ships";
import {
  PROPULSION_NONE,
  USER_SETTINGS_VERSION,
  type DisplayPreferences,
  type ProfileParamOverrides,
  type ProfileSettings as ProfileSettingsWire,
  type PropulsionSelection,
  type UserSettings,
  type WeaponRangeVisibility,
} from "./userSettings";
import type { SimValueParser, WeaponKind } from "../sim";
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
import { type CombatantSettings, type SessionSettings } from "./combatantSettings";
import {
  isLanguage,
  isNonNegative,
  isOptionalBoosterActivations,
  isOptionalBoolean,
  isOptionalEwarActivation,
  isOptionalFittedHullSummary,
  isFiniteNumber,
  isOptionalFittingText,
  isOptionalMissileBoosterActivations,
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
  private readonly guards: SimValueParser;

  constructor(deps: { ships: Ships; fittingImport: FittingImport; chargeCatalog: ChargeCatalog; missileCatalog: MissileCatalog; itemNameResolver: ItemNameResolver; simValueParser: SimValueParser }) {
    this.ships = deps.ships;
    this.fittingImport = deps.fittingImport;
    this.chargeCatalog = deps.chargeCatalog;
    this.itemNameResolver = deps.itemNameResolver;
    this.guards = deps.simValueParser;
    this.fittingBasis = new FittingBasis(deps);
  }

  parseUserSettings(raw: string): SessionSettings | null {
    const wire = this.parseWire(raw);
    return wire ? fromWireSettings(wire) : null;
  }

  fromWire(wire: UserSettings): SessionSettings {
    return fromWireSettings(wire);
  }

  toWire(settings: SessionSettings): UserSettings {
    return toWireSettings(settings);
  }

  fromProfile(profile: ProfileSettingsWire, display: DisplayPreferences): SessionSettings {
    return fromWireSettings({
      ...profile,
      shipAAmmo: profile.shipAAmmo ?? this.chargeCatalog.usualForChargeSize(DEFAULT_TURRET_CHARGE_SIZE),
      shipBAmmo: profile.shipBAmmo ?? this.chargeCatalog.usualForChargeSize(DEFAULT_TURRET_CHARGE_SIZE),
      language: display.language,
      shipATrackingUnit: display.shipATrackingUnit,
      shipBTrackingUnit: display.shipBTrackingUnit,
      weaponRangeVisibility: display.weaponRangeVisibility,
      simSpeed: display.simSpeed,
      gridBrightness: display.gridBrightness,
      autoZoom: display.autoZoom,
      zoomFactor: display.zoomFactor,
    });
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

  decodeUrlSettings(encoded: string): SessionSettings | null {
    try {
      const wire = this.parseWire(decodeBase64(encoded));
      if (!wire) return null;
      const shipA = this.fittingBasis.rebuild(wire, "shipA");
      const shipB = this.fittingBasis.rebuild(wire, "shipB");
      return fromWireSettings({ ...wire, ...shipA, ...shipB });
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

  serialize(settings: SessionSettings | ProfileSettingsWire | UserSettingsWire): string {
    if (isSessionSettings(settings)) {
      return JSON.stringify(toWireSettings(settings));
    }
    return JSON.stringify(settings);
  }

  private parseWire(raw: string): UserSettingsWire | null {
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
      return record;
    } catch {
      return null;
    }
  }

  private isProfileSettings(value: unknown): value is UserSettingsWire {
    if (!isRecord(value)) return false;
    const s = value;
    return (
      isSettingsVersion(s.version) &&
      isNonNegative(s.shipATracking) &&
      this.guards.parseSigResolutionClass(s.shipASigRes) !== undefined &&
      isNonNegative(s.shipAOptimal) &&
      isNonNegative(s.shipAFalloff) &&
      isNonNegative(s.shipBTracking) &&
      this.guards.parseSigResolutionClass(s.shipBSigRes) !== undefined &&
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
      isWeaponRangeVisibilityValue(value.weaponRangeVisibility) &&
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
      this.guards.parseAutopilotMode(s[`${p}Mode`]) !== undefined &&
      isNonNegative(s[`${p}Range`]) &&
      isNonNegative(s[`${p}Mass`]) &&
      isNonNegative(s[`${p}Inertia`]) &&
      isOptionalNonNegative(s[`${p}Aggressivity`]) &&
      isOptionalSkillLevel(s[`${p}SkillLevel`]) &&
      isOptionalBoolean(s[`${p}Overload`]) &&
      isOptionalBoolean(s[`${p}WeaponOverload`]) &&
      isOptionalNonEmptyString(s[`${p}HullId`]) &&
      this.isOptionalPropulsionSelection(s[`${p}Propulsion`]) &&
      isOptionalFittingText(s[`${p}Fitting`]) &&
      isOptionalProfileParamOverrides(s[`${p}Overrides`], this.guards) &&
      isOptionalFittedHullSummary(s[`${p}FittedHull`]) &&
      isOptionalEwarActivation(s[`${p}EwarActivation`]) &&
      isOptionalBoosterActivations(s[`${p}BoosterActivation`]) &&
      isOptionalMissileBoosterActivations(s[`${p}MissileBoosterActivation`]) &&
      isOptionalWeaponKind(s[`${p}WeaponKind`]) &&
      isOptionalNonEmptyString(s[`${p}MissileAmmo`]) &&
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
    record.weaponRangeVisibility = isWeaponRangeVisibilityValue(record.weaponRangeVisibility) ? record.weaponRangeVisibility : DEFAULT_PREFERENCES.weaponRangeVisibility;
    record.simSpeed ??= DEFAULT_PREFERENCES.simSpeed;
    record.gridBrightness ??= DEFAULT_PREFERENCES.gridBrightness;
    record.autoZoom ??= DEFAULT_PREFERENCES.autoZoom;
    record.zoomFactor ??= DEFAULT_PREFERENCES.zoomFactor;
  }

  private normalizeAndDefaultAggressivity(record: Record<string, unknown>): void {
    if (record.shipAAggressivity === undefined && isFiniteNumber(record.maneuverAggressivity)) {
      record.shipAAggressivity = this.guards.normalizeAggressivity(record.maneuverAggressivity);
    }
    record.shipAAggressivity = this.guards.normalizeAggressivity(isFiniteNumber(record.shipAAggressivity) ? record.shipAAggressivity : AGGRESSIVITY_DEFAULT);
    record.shipBAggressivity = this.guards.normalizeAggressivity(isFiniteNumber(record.shipBAggressivity) ? record.shipBAggressivity : AGGRESSIVITY_DEFAULT);
    delete record.maneuverAggressivity;
  }

  private migrateBoosterActivation(value: Record<string, unknown>): void {
    this.migrateSideBoosterActivation(value, "shipABoosterActivation");
    this.migrateSideBoosterActivation(value, "shipBBoosterActivation");
    this.migrateSideMissileBoosterActivation(value, "shipAMissileBoosterActivation");
    this.migrateSideMissileBoosterActivation(value, "shipBMissileBoosterActivation");
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

  private migrateSideMissileBoosterActivation(value: Record<string, unknown>, key: string): void {
    const saved = value[key];
    if (!Array.isArray(saved)) return;
    value[key] = saved.map((item) => this.migrateMissileBoosterEntry(item));
  }

  private migrateMissileBoosterEntry(item: unknown): unknown {
    if (!isRecord(item)) return item;
    const record = { ...item };
    const active = typeof record.active === "boolean" ? record.active : false;
    const overloaded = typeof record.overloaded === "boolean" ? record.overloaded : false;
    if (record.script === undefined) return { active, overloaded, script: "none" };
    if (typeof record.script !== "string") return item;
    return { active, overloaded, script: resolveBoosterScript(record.script, this.itemNameResolver) };
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

function isWeaponRangeVisibilityValue(value: unknown): value is WeaponRangeVisibility {
  return value === "shipA" || value === "shipB" || value === "both" || value === "none";
}

function isProfileStorage(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isSessionSettings(value: UserSettingsWire | ProfileSettingsWire | SessionSettings): value is SessionSettings {
  return "shipA" in value;
}

function fromWireSettings(wire: UserSettingsWire): SessionSettings {
  const gridBrightness = wire.gridBrightness ?? DEFAULT_PREFERENCES.gridBrightness;
  const autoZoom = wire.autoZoom ?? true;
  const zoomFactor = wire.zoomFactor ?? 1;
  return {
    version: wire.version,
    display: {
      language: wire.language,
      shipATrackingUnit: wire.shipATrackingUnit,
      shipBTrackingUnit: wire.shipBTrackingUnit,
      weaponRangeVisibility: wire.weaponRangeVisibility,
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

function toWireSettings(session: SessionSettings): UserSettingsWire {
  const wire: UserSettingsWire = {
    version: session.version,
    language: session.display.language,
    shipATrackingUnit: session.display.shipATrackingUnit,
    shipBTrackingUnit: session.display.shipBTrackingUnit,
    weaponRangeVisibility: session.display.weaponRangeVisibility,
    simSpeed: session.display.simSpeed,
    gridBrightness: session.display.gridBrightness,
    autoZoom: session.display.autoZoom,
    zoomFactor: session.display.zoomFactor,
    initialDistance: session.initialDistance,
    shipAAmmo: session.shipA.ammo,
    shipBAmmo: session.shipB.ammo,
    shipATracking: session.shipA.tracking,
    shipASigRes: session.shipA.sigRes,
    shipAOptimal: session.shipA.optimal,
    shipAFalloff: session.shipA.falloff,
    shipBTracking: session.shipB.tracking,
    shipBSigRes: session.shipB.sigRes,
    shipBOptimal: session.shipB.optimal,
    shipBFalloff: session.shipB.falloff,
    shipASpeed: session.shipA.speed,
    shipAMode: session.shipA.mode,
    shipARange: session.shipA.range,
    shipAAggressivity: session.shipA.aggressivity,
    shipAMass: session.shipA.mass,
    shipAInertia: session.shipA.inertia,
    shipBSpeed: session.shipB.speed,
    shipBMode: session.shipB.mode,
    shipBRange: session.shipB.range,
    shipBAggressivity: session.shipB.aggressivity,
    shipBMass: session.shipB.mass,
    shipBInertia: session.shipB.inertia,
    shipBSig: session.shipB.sig ?? 1,
  };
  setOptionalShipFields(wire, session.shipA, "shipA");
  setOptionalShipFields(wire, session.shipB, "shipB");
  return wire;
}

function setOptionalShipFields(wire: UserSettingsWire, combatant: CombatantSettings, side: "shipA" | "shipB"): void {
  const p = side;
  if (combatant.skillLevel !== undefined) wire[`${p}SkillLevel` as const] = combatant.skillLevel;
  wire[`${p}Overload` as const] = combatant.overload;
  wire[`${p}WeaponOverload` as const] = combatant.weaponOverload;
  if (combatant.hull !== undefined) wire[`${p}HullId` as const] = combatant.hull;
  if (combatant.propulsion !== undefined) wire[`${p}Propulsion` as const] = combatant.propulsion;
  if (combatant.fitting !== undefined) wire[`${p}Fitting` as const] = combatant.fitting;
  if (Object.keys(combatant.overrides).length > 0) wire[`${p}Overrides` as const] = combatant.overrides;
  if (combatant.fittedHull !== undefined) wire[`${p}FittedHull` as const] = combatant.fittedHull;
  if (combatant.ewarActivation !== undefined) wire[`${p}EwarActivation` as const] = combatant.ewarActivation;
  if (combatant.boosterActivation !== undefined) wire[`${p}BoosterActivation` as const] = combatant.boosterActivation;
  if (combatant.missileBoosterActivation !== undefined) wire[`${p}MissileBoosterActivation` as const] = combatant.missileBoosterActivation;
  if (combatant.weaponKind !== undefined) wire[`${p}WeaponKind` as const] = combatant.weaponKind;
  if (combatant.missileAmmo !== undefined) wire[`${p}MissileAmmo` as const] = combatant.missileAmmo;
  if (combatant.droneGroups !== undefined) wire[`${p}DroneGroups` as const] = combatant.droneGroups;
  if (combatant.sig !== undefined && side === "shipA") wire.shipASig = combatant.sig;
}

function toCombatantSettings(settings: UserSettingsWire, side: "shipA" | "shipB"): CombatantSettings {
  const overrides = sideValue(side, settings.shipAOverrides, settings.shipBOverrides) ?? {};
  const sigKey: keyof ProfileParamOverrides = side === "shipA" ? "shipASig" : "shipBSig";
  const sig = sideValue(side, settings.shipASig, settings.shipBSig) ?? overrides[sigKey];
  return {
    speed: sideValue(side, settings.shipASpeed, settings.shipBSpeed),
    mode: sideValue(side, settings.shipAMode, settings.shipBMode),
    range: sideValue(side, settings.shipARange, settings.shipBRange),
    mass: sideValue(side, settings.shipAMass, settings.shipBMass),
    inertia: sideValue(side, settings.shipAInertia, settings.shipBInertia),
    aggressivity: sideValue(side, settings.shipAAggressivity, settings.shipBAggressivity) ?? 1,
    skillLevel: sideValue(side, settings.shipASkillLevel, settings.shipBSkillLevel),
    overload: sideValue(side, settings.shipAOverload, settings.shipBOverload) ?? true,
    weaponOverload: sideValue(side, settings.shipAWeaponOverload, settings.shipBWeaponOverload) ?? false,
    hull: sideValue(side, settings.shipAHullId, settings.shipBHullId),
    propulsion: sideValue(side, settings.shipAPropulsion, settings.shipBPropulsion),
    fitting: sideValue(side, settings.shipAFitting, settings.shipBFitting),
    overrides,
    fittedHull: sideValue(side, settings.shipAFittedHull, settings.shipBFittedHull),
    ewarActivation: sideValue(side, settings.shipAEwarActivation, settings.shipBEwarActivation),
    boosterActivation: sideValue(side, settings.shipABoosterActivation, settings.shipBBoosterActivation),
    missileBoosterActivation: sideValue(side, settings.shipAMissileBoosterActivation, settings.shipBMissileBoosterActivation),
    sig,
    tracking: sideValue(side, settings.shipATracking, settings.shipBTracking) ?? settings.tracking ?? 0,
    sigRes: sideValue(side, settings.shipASigRes, settings.shipBSigRes) ?? settings.sigRes ?? "S",
    optimal: sideValue(side, settings.shipAOptimal, settings.shipBOptimal) ?? settings.optimal ?? 0,
    falloff: sideValue(side, settings.shipAFalloff, settings.shipBFalloff) ?? settings.falloff ?? 0,
    ammo: sideValue(side, settings.shipAAmmo, settings.shipBAmmo),
    weaponKind: sideValue(side, settings.shipAWeaponKind, settings.shipBWeaponKind),
    missileAmmo: sideValue(side, settings.shipAMissileAmmo, settings.shipBMissileAmmo),
    droneGroups: sideValue(side, settings.shipADroneGroups, settings.shipBDroneGroups),
  };
}

function sideValue<T>(side: "shipA" | "shipB", shipAValue: T, shipBValue: T): T {
  return side === "shipA" ? shipAValue : shipBValue;
}

function isOptionalWeaponKind(value: unknown): value is WeaponKind | undefined {
  return value === undefined || value === "turret" || value === "missile" || value === "drone";
}
