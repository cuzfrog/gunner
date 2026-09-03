import type { DroneSizeClass, DroneStats, HullBonus } from "../gamedata/fittingDb";
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
  readonly hullDamageMultiplier: number;
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

    const droneHullBonuses = hullBonuses.filter((b) => b.attribute === "droneDamage" && (b.chargeSkillId === undefined || b.chargeSkillId === sizeSkillId || b.chargeSkillId === DRONES_SKILL_ID));
    const hullDamageMultiplier = droneHullBonuses.length > 0 ? droneHullBonuses.reduce((acc, b) => acc * (1 + (b.magnitude * (b.scalesWithHullSkill ? skillLevel : 1)) / 100), 1) : 1;

    const totalDamageMultiplier = drone.damageMultiplier * skillDamageMultiplier * hullDamageMultiplier;
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
    };
  }
}

function sizeSkillIdForClass(sizeClass: DroneSizeClass): TypeId | undefined {
  switch (sizeClass) {
    case "light": return LIGHT_DRONE_OPERATION_ID;
    case "medium": return MEDIUM_DRONE_OPERATION_ID;
    case "heavy": return HEAVY_DRONE_OPERATION_ID;
    case "sentry": return SENTRY_DRONE_INTERFACING_ID;
  }
}
