import type { ChargeCatalog, FittingImport, MissileCatalog } from "../fitting";
import type { TypeId } from "../gamedata/ids";
import type { PropulsionId, PropulsionStats, Ships } from "../ships";
import { PROPULSION_NONE, type FittedHullSummary, type UserSettings } from "./userSettings";

export class FittingBasis {
  private readonly ships: Ships;
  private readonly fittingImport: FittingImport;
  private readonly chargeCatalog: ChargeCatalog;
  private readonly missileCatalog: MissileCatalog;

  constructor(deps: { ships: Ships; fittingImport: FittingImport; chargeCatalog: ChargeCatalog; missileCatalog: MissileCatalog }) {
    this.ships = deps.ships;
    this.fittingImport = deps.fittingImport;
    this.chargeCatalog = deps.chargeCatalog;
    this.missileCatalog = deps.missileCatalog;
  }

  rebuild(settings: UserSettings, side: "shipA" | "shipB"): Partial<UserSettings> {
    const fittingKey = side === "shipA" ? "shipAFitting" : "shipBFitting";
    const text = settings[fittingKey];
    if (!text) return {};

    const skillLevel = side === "shipA" ? settings.shipASkillLevel ?? 5 : settings.shipBSkillLevel ?? 5;
    const overloaded = side === "shipA" ? settings.shipAOverload ?? true : settings.shipBOverload ?? true;
    const imported = this.fittingImport.importFitting(text, { skillLevel, overloaded });
    if (!imported) return {};

    const conditions = { skillLevel, overloaded };
    const profile = imported.profile;
    const propulsionKey = side === "shipA" ? "shipAPropulsion" : "shipBPropulsion";
    const storedPropulsionId = settings[propulsionKey];
    const storedFittedHull = side === "shipA" ? settings.shipAFittedHull : settings.shipBFittedHull;
    const importedPropulsion = imported.propulsion;
    const importedPropulsionId = importedPropulsion?.propulsionId;
    const explicitNone = storedPropulsionId === PROPULSION_NONE;
    let activePropulsionId: PropulsionId | undefined;
    let activePropulsion: PropulsionStats | undefined;
    let activePropulsionName: string | undefined;
    let activePropulsionModuleId: TypeId | undefined;

    if (!explicitNone) {
      activePropulsionId = storedPropulsionId ?? importedPropulsionId;
      if (activePropulsionId && storedFittedHull?.propulsionId === activePropulsionId) {
        const storedModuleId = storedFittedHull.propulsionModuleId;
        const storedName = storedFittedHull.propulsionName;
        if (storedModuleId) {
          const exact = this.fittingImport.propulsionStatsById(storedModuleId);
          if (exact) {
            activePropulsion = exact;
            activePropulsionModuleId = storedModuleId;
            activePropulsionName = this.fittingImport.itemNameForId(storedModuleId, "en");
          }
        }
        if (!activePropulsion && storedName) {
          const exact = this.fittingImport.propulsionStats(storedName);
          if (exact) {
            activePropulsion = exact;
            activePropulsionName = storedName;
          }
        }
      }
      if (!activePropulsion) {
        const generic = activePropulsionId ? this.ships.fittingOption(profile, activePropulsionId) : undefined;
        if (generic) {
          const variants = this.fittingImport.propulsionVariantNames(generic);
          const defaultVariant = variants.find((variant) => variant.name === generic.label) ?? variants[0];
          activePropulsionName = defaultVariant ? this.fittingImport.itemNameForId(defaultVariant.id, "en") : generic.label;
          if (defaultVariant) {
            activePropulsionModuleId = defaultVariant.id;
            activePropulsion = this.fittingImport.propulsionStatsById(defaultVariant.id) ?? generic;
          } else {
            activePropulsion = generic;
          }
        }
      }
      if (!activePropulsion && importedPropulsion) {
        activePropulsion = importedPropulsion;
        activePropulsionId = importedPropulsionId;
        activePropulsionModuleId = importedPropulsion.propulsionModuleId;
        activePropulsionName = importedPropulsion.propulsionName ?? activePropulsionName;
      }
    }
    const fittedPropulsion = explicitNone ? importedPropulsion : activePropulsion;
    const fittedPropulsionId = explicitNone ? importedPropulsionId : activePropulsionId;
    const fittedPropulsionName = explicitNone ? importedPropulsion?.propulsionName : activePropulsionName;
    const fittedPropulsionModuleId = explicitNone ? importedPropulsion?.propulsionModuleId : activePropulsionModuleId;
    const overrides = side === "shipA" ? settings.shipAOverrides : settings.shipBOverrides;
    const override = overrides ?? {};
    const speedOverride = side === "shipA" ? override.shipASpeed : override.shipBSpeed;
    const stats = this.ships.fittedStats(profile, imported.fitted, activePropulsion, conditions, speedOverride);
    const fittedHull: FittedHullSummary = {
      fittingName: imported.fittingName,
      propulsionId: fittedPropulsionId,
      propulsionModuleId: fittedPropulsionModuleId,
      propulsionName: fittedPropulsionName,
      propulsionKind: fittedPropulsionId !== undefined ? this.ships.fittingOption(profile, fittedPropulsionId)?.kind : undefined,
      fitted: imported.fitted,
      propulsion: fittedPropulsion,
      baseMaxSpeed: stats.baseMaxSpeed,
    };
    const massOverride = side === "shipA" ? override.shipAMass : override.shipBMass;
    const mass = massOverride ?? stats.mass;
    const speed = speedOverride ?? this.ships.maxSpeedForFittedMass(profile, fittedHull.fitted, mass, activePropulsion, conditions);

    const result: Partial<UserSettings> = {};
    if (side === "shipA") {
      result.shipAHullId = imported.profile.id;
      result.shipAPropulsion = explicitNone ? PROPULSION_NONE : activePropulsionId;
      result.shipAFittedHull = fittedHull;
      result.shipAMass = mass;
      result.shipAInertia = override.shipAInertia ?? stats.inertiaModifier;
      result.shipASpeed = speed;
      result.shipASig = override.shipASig ?? stats.sigRadius;
    } else {
      result.shipBHullId = imported.profile.id;
      result.shipBPropulsion = explicitNone ? PROPULSION_NONE : activePropulsionId;
      result.shipBFittedHull = fittedHull;
      result.shipBMass = mass;
      result.shipBInertia = override.shipBInertia ?? stats.inertiaModifier;
      result.shipBSpeed = speed;
      result.shipBSig = override.shipBSig ?? stats.sigRadius;
    }
    if (imported.turret) {
      const options = this.chargeCatalog.chargesForSize(imported.turret.chargeSize);
      const storedAmmo = side === "shipA" ? settings.shipAAmmo : settings.shipBAmmo;
      const option = options.find((c) => c.id === storedAmmo);
      const turret = option ? this.chargeCatalog.withCharge(imported.turret, option.id) : imported.turret;
      if (side === "shipA") {
        result.shipATracking = override.tracking ?? turret.tracking;
        result.shipASigRes = override.sigRes ?? turret.sigResolutionClass;
        result.shipAOptimal = override.optimal ?? turret.optimal;
        result.shipAFalloff = override.falloff ?? turret.falloff;
        result.shipAAmmo = turret.chargeId;
      } else {
        result.shipBTracking = override.tracking ?? turret.tracking;
        result.shipBSigRes = override.sigRes ?? turret.sigResolutionClass;
        result.shipBOptimal = override.optimal ?? turret.optimal;
        result.shipBFalloff = override.falloff ?? turret.falloff;
        result.shipBAmmo = turret.chargeId;
      }
    }
    if (imported.launcher) {
      const storedMissileAmmo = side === "shipA" ? settings.shipAMissileAmmo : settings.shipBMissileAmmo;
      const launcher = storedMissileAmmo && this.missileCatalog.has(storedMissileAmmo)
        ? this.missileCatalog.withCharge(imported.launcher, storedMissileAmmo, imported.hullBonuses, skillLevel)
        : imported.launcher;
      if (side === "shipA") {
        result.shipAMissileAmmo = launcher.chargeId;
      } else {
        result.shipBMissileAmmo = launcher.chargeId;
      }
    }
    return result;
  }
}
