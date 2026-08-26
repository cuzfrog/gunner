import type { ChargeCatalog, FittingImport } from "../fitting";
import type { PropulsionId, PropulsionStats, Ships } from "../ships";
import { PROPULSION_NONE, type FittedHullSummary, type UserSettings } from "./userSettings";

export class FittingBasis {
  private readonly ships: Ships;
  private readonly fittingImport: FittingImport;
  private readonly chargeCatalog: ChargeCatalog;

  constructor(deps: { ships: Ships; fittingImport: FittingImport; chargeCatalog: ChargeCatalog }) {
    this.ships = deps.ships;
    this.fittingImport = deps.fittingImport;
    this.chargeCatalog = deps.chargeCatalog;
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
          activePropulsionName = variants.find((variant) => variant.name === generic.label)?.name ?? variants[0]?.name ?? generic.label;
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
    const overrides = side === "shipA" ? settings.shipAOverrides : settings.shipBOverrides;
    const override = overrides ?? {};
    const speedOverride = side === "shipA" ? override.shipASpeed : override.shipBSpeed;
    const stats = this.ships.fittedStats(profile, imported.fitted, activePropulsion, conditions, speedOverride);
    const fittedHull: FittedHullSummary = {
      fittingName: imported.fittingName,
      propulsionId: fittedPropulsionId,
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
      const option = options.find((c) => c.name === storedAmmo || c.id === storedAmmo);
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
    return result;
  }
}
