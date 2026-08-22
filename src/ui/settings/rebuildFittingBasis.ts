import type { ChargeCatalog, FittingImport } from "../../fitting";
import type { FittedHull, PropulsionId, PropulsionStats, Ships } from "../../ships";
import { PROPULSION_NONE, type FittedHullSummary, type PropulsionSelection, type UserSettings, type ProfileParamOverrides } from "./userSettings";

export function rebuildFittingBasis(
  deps: { ships: Ships; fittingImport: FittingImport; chargeCatalog: ChargeCatalog },
  settings: UserSettings,
  side: "attacker" | "target",
): Partial<UserSettings> {
  const { ships, fittingImport, chargeCatalog } = deps;
  const fittingKey = side === "attacker" ? "attackerFitting" : "targetFitting";
  const text = settings[fittingKey];
  if (!text) return {};

  const skillLevel = side === "attacker" ? settings.attackerSkillLevel ?? 5 : settings.targetSkillLevel ?? 5;
  const overloaded = side === "attacker" ? settings.attackerOverload ?? true : settings.targetOverload ?? true;
  const imported = fittingImport.importFitting(text, { skillLevel, overloaded });
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
      const exact = fittingImport.propulsionStats(storedFittedHull.propulsionName);
      if (exact) {
        activePropulsion = exact;
        activePropulsionName = storedFittedHull.propulsionName;
      }
    }
    if (!activePropulsion) {
      const generic = activePropulsionId ? ships.fittingOption(profile, activePropulsionId) : undefined;
      if (generic) {
        const variants = fittingImport.propulsionVariantNames(generic);
        activePropulsionName = variants.find((name) => name === generic.label) ?? variants[0] ?? generic.label;
        activePropulsion = fittingImport.propulsionStats(activePropulsionName) ?? generic;
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
  const stats = ships.fittedStats(profile, fittedHull.fitted, activePropulsion, conditions);
  const overrides = side === "attacker" ? settings.attackerOverrides : settings.targetOverrides;
  const override = overrides ?? {};
  const massOverride = side === "attacker" ? override.attackerMass : override.targetMass;
  const mass = massOverride ?? stats.mass;
  const speedOverride = side === "attacker" ? override.attackerSpeed : override.targetSpeed;
  const speed = speedOverride ?? ships.maxSpeedForFittedMass(profile, fittedHull.fitted, mass, activePropulsion, conditions);

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
    const options = chargeCatalog.chargesForSize(imported.turret.chargeSize);
    const storedAmmo = settings.attackerAmmo;
    const valid = options.some((c) => c.name === storedAmmo);
    const turret = valid ? chargeCatalog.withCharge(imported.turret, storedAmmo) : imported.turret;
    result.tracking = override.tracking ?? turret.tracking;
    result.sigRes = override.sigRes ?? turret.sigResolutionClass;
    result.optimal = override.optimal ?? turret.optimal;
    result.falloff = override.falloff ?? turret.falloff;
    result.attackerAmmo = turret.charge;
  }
  return result;
}
