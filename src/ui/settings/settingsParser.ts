import type { ChargeCatalog, FittingImport } from "../../fitting";
import type { FittedHull, PropulsionId, PropulsionStats, Ships } from "../../ships";
import {
  PROPULSION_NONE,
  USER_SETTINGS_VERSION,
  type FittedHullSummary,
  type ProfileParamOverrides,
  type ProfileSettings,
  type PropulsionSelection,
  type UserSettings,
} from "./userSettings";
import { decodeBase64 } from "./urlCodec";
import {
  isAutopilotMode,
  isLanguage,
  isNonNegative,
  isNonNegativeNumber,
  isOptionalBoolean,
  isOptionalFittedHullSummary,
  isOptionalFittingText,
  isOptionalNonEmptyString,
  isOptionalNonNegative,
  isOptionalProfileParamOverrides,
  isOptionalSkillLevel,
  isPositive,
  isPositiveNumber,
  isSettingsVersion,
  isSigResolutionClass,
  stripDisplayPreferences,
} from "./validators";

const DEFAULT_TURRET_CHARGE_SIZE = 1;

export class SettingsParser {
  private readonly ships: Ships;
  private readonly fittingImport: FittingImport;
  private readonly chargeCatalog: ChargeCatalog;

  constructor(deps: { ships: Ships; fittingImport: FittingImport; chargeCatalog: ChargeCatalog }) {
    this.ships = deps.ships;
    this.fittingImport = deps.fittingImport;
    this.chargeCatalog = deps.chargeCatalog;
  }

  parseUserSettings(raw: string): UserSettings | null {
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
      return { ...settings, ...this.rebuildBasis(settings, "attacker"), ...this.rebuildBasis(settings, "target") };
    } catch {
      return null;
    }
  }

  profileFromUnknown(value: unknown): ProfileSettings | null {
    if (!this.isProfileSettings(value)) return null;
    const withVersion = { ...value, version: USER_SETTINGS_VERSION } as Record<string, unknown>;
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
      isOptionalNonEmptyString(s.attackerAmmo)
    );
  }

  private isUserSettings(value: unknown): value is UserSettings {
    if (!this.isProfileSettings(value)) return false;
    const s = value as Record<string, unknown>;
    return isLanguage(s.language) && (s.trackingUnit === "rad" || s.trackingUnit === "score");
  }

  private isOptionalPropulsionSelection(value: unknown): value is PropulsionSelection | undefined {
    return value === undefined || value === PROPULSION_NONE || this.ships.parsePropulsionId(value) !== undefined;
  }

  private rebuildBasis(settings: UserSettings, side: "attacker" | "target"): Partial<UserSettings> {
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
