import type { DroneBonusAttribute, DroneSizeClass, DroneStats, HullBonus } from "../gamedata/fittingDb";
import { toTypeId, type TypeId } from "../gamedata/ids";
import type { SkillLevel } from "../ships";

export interface DroneSkillOutput {
  readonly damageMultiplier: number;
  readonly tracking: number;
  readonly optimal: number;
  readonly falloff: number;
  readonly maxVelocity: number;
  readonly orbitSpeed: number;
  readonly skillDamageMultiplier: number;
  readonly skillDamageIds: readonly TypeId[];
  // Ship hull multiplier from droneDamage bonuses (subsystem contributions are separate).
  readonly hullDamageMultiplier: number;
  // Damage multipliers contributed by individual subsystems, for factor attribution.
  readonly subsystemDamageMultipliers?: readonly { readonly sourceId: TypeId; readonly multiplier: number }[];
}

export interface DroneSkillModel {
  compute(drone: DroneStats, hullBonuses: readonly HullBonus[], skillLevel: SkillLevel): DroneSkillOutput;
}

const DRONE_INTERFACING_BONUS = 0.10;
const SIZE_SKILL_BONUS = 0.05;
const DRONE_NAVIGATION_BONUS = 0.05;
const DRONE_SHARPSHOOTING_BONUS = 0.05;

const DRONE_INTERFACING_ID = toTypeId("3442");
const LIGHT_DRONE_OPERATION_ID = toTypeId("24241");
const MEDIUM_DRONE_OPERATION_ID = toTypeId("33699");
const HEAVY_DRONE_OPERATION_ID = toTypeId("3441");
const SENTRY_DRONE_INTERFACING_ID = toTypeId("23594");
const DRONES_SKILL_ID = toTypeId("3436");

export class DroneSkillModelImpl implements DroneSkillModel {
  compute(drone: DroneStats, hullBonuses: readonly HullBonus[], skillLevel: SkillLevel): DroneSkillOutput {
    const sizeSkillId = sizeSkillIdForClass(drone.sizeClass);
    const interfacingMultiplier = 1 + DRONE_INTERFACING_BONUS * skillLevel;
    const sizeSkillMultiplier = sizeSkillId !== undefined ? 1 + SIZE_SKILL_BONUS * skillLevel : 1;
    const skillDamageMultiplier = interfacingMultiplier * sizeSkillMultiplier;
    const skillDamageIds: TypeId[] = [DRONE_INTERFACING_ID];
    if (sizeSkillId !== undefined) skillDamageIds.push(sizeSkillId);

    const droneHullBonuses = hullBonuses.filter((b) => isDroneBonusAttribute(b.attribute) && b.attribute === "droneDamage" && (b.chargeSkillId === undefined || b.chargeSkillId === sizeSkillId || b.chargeSkillId === DRONES_SKILL_ID));
    const shipBonuses = droneHullBonuses.filter((b) => b.sourceId === undefined);
    const hullDamageMultiplier = shipBonuses.length > 0 ? shipBonuses.reduce((acc, b) => acc * (1 + (b.magnitude * (b.scalesWithHullSkill ? skillLevel : 1)) / 100), 1) : 1;
    const subsystemDamageMultipliers = subsystemDamageMultipliersFrom(droneHullBonuses, skillLevel);

    const totalDamageMultiplier = drone.damageMultiplier * skillDamageMultiplier * hullDamageMultiplier * subsystemDamageMultipliers.reduce((acc, s) => acc * s.multiplier, 1);
    const navigationMultiplier = 1 + DRONE_NAVIGATION_BONUS * skillLevel;
    const sharpshootingMultiplier = 1 + DRONE_SHARPSHOOTING_BONUS * skillLevel;

    return {
      damageMultiplier: totalDamageMultiplier,
      tracking: drone.tracking,
      optimal: drone.optimal * sharpshootingMultiplier,
      falloff: drone.falloff,
      maxVelocity: drone.maxVelocity * navigationMultiplier,
      orbitSpeed: drone.orbitSpeed,
      skillDamageMultiplier,
      skillDamageIds,
      hullDamageMultiplier,
      ...(subsystemDamageMultipliers.length > 0 ? { subsystemDamageMultipliers } : {}),
    };
  }
}

function subsystemDamageMultipliersFrom(bonuses: readonly HullBonus[], skillLevel: SkillLevel): readonly { readonly sourceId: TypeId; readonly multiplier: number }[] {
  const bySource = new Map<TypeId, number>();
  for (const bonus of bonuses) {
    if (bonus.sourceId === undefined) continue;
    const multiplier = 1 + (bonus.magnitude * (bonus.scalesWithHullSkill ? skillLevel : 1)) / 100;
    bySource.set(bonus.sourceId, (bySource.get(bonus.sourceId) ?? 1) * multiplier);
  }
  return [...bySource.entries()].map(([sourceId, multiplier]) => ({ sourceId, multiplier }));
}

function sizeSkillIdForClass(sizeClass: DroneSizeClass): TypeId | undefined {
  switch (sizeClass) {
    case "light": return LIGHT_DRONE_OPERATION_ID;
    case "medium": return MEDIUM_DRONE_OPERATION_ID;
    case "heavy": return HEAVY_DRONE_OPERATION_ID;
    case "sentry": return SENTRY_DRONE_INTERFACING_ID;
  }
}

const DRONE_BONUS_ATTRIBUTES: Record<DroneBonusAttribute, true> = { droneDamage: true };

function isDroneBonusAttribute(attr: HullBonus["attribute"]): attr is DroneBonusAttribute {
  return attr in DRONE_BONUS_ATTRIBUTES;
}
