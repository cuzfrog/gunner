import type { DroneStats, HullBonus, SkillBonus } from "../gamedata/fittingDb";
import { type TypeId } from "../gamedata/ids";
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

interface DroneSkillModelDeps {
  readonly skillBonuses: readonly SkillBonus[];
}

export class DroneSkillModelImpl implements DroneSkillModel {
  private readonly droneSkillBonuses: readonly (SkillBonus & { readonly requiredSkillId: TypeId })[];

  constructor({ skillBonuses }: DroneSkillModelDeps) {
    this.droneSkillBonuses = skillBonuses.filter(isChainScopedDroneBonus);
  }

  compute(drone: DroneStats, hullBonuses: readonly HullBonus[], skillLevel: SkillLevel): DroneSkillOutput {
    const matching = this.droneSkillBonuses.filter((b) => drone.requiredSkillIds.includes(b.requiredSkillId));
    const damageBonuses = matching.filter((b) => b.bonusType === "droneDamage");
    const skillDamageMultiplier = multiplyPerLevel(damageBonuses, skillLevel);
    const skillDamageIds = damageBonuses.map((b) => b.skillId);
    const skillOptimalMultiplier = multiplyPerLevel(matching.filter((b) => b.bonusType === "droneOptimal"), skillLevel);
    const skillVelocityMultiplier = multiplyPerLevel(matching.filter((b) => b.bonusType === "droneVelocity"), skillLevel);

    const droneHullBonuses = hullBonuses.filter((b) => b.attribute === "droneDamage" && (b.chargeSkillId === undefined || drone.requiredSkillIds.includes(b.chargeSkillId)));
    const shipBonuses = droneHullBonuses.filter((b) => b.sourceId === undefined);
    const hullDamageMultiplier = shipBonuses.length > 0 ? shipBonuses.reduce((acc, b) => acc * (1 + (b.magnitude * (b.scalesWithHullSkill ? skillLevel : 1)) / 100), 1) : 1;
    const subsystemDamageMultipliers = subsystemDamageMultipliersFrom(droneHullBonuses, skillLevel);

    const totalDamageMultiplier = drone.damageMultiplier * skillDamageMultiplier * hullDamageMultiplier * subsystemDamageMultipliers.reduce((acc, s) => acc * s.multiplier, 1);

    return {
      damageMultiplier: totalDamageMultiplier,
      tracking: drone.tracking,
      optimal: drone.optimal * skillOptimalMultiplier,
      falloff: drone.falloff,
      maxVelocity: drone.maxVelocity * skillVelocityMultiplier,
      orbitSpeed: drone.orbitSpeed,
      skillDamageMultiplier,
      skillDamageIds,
      hullDamageMultiplier,
      ...(subsystemDamageMultipliers.length > 0 ? { subsystemDamageMultipliers } : {}),
    };
  }
}

const DRONE_BONUS_TYPES = ["droneDamage", "droneOptimal", "droneVelocity"] as const;

function isChainScopedDroneBonus(bonus: SkillBonus): bonus is SkillBonus & { readonly requiredSkillId: TypeId } {
  return (DRONE_BONUS_TYPES as readonly string[]).includes(bonus.bonusType) && bonus.requiredSkillId !== undefined;
}

function multiplyPerLevel(bonuses: readonly SkillBonus[], skillLevel: SkillLevel): number {
  return bonuses.reduce((acc, b) => acc * (1 + (b.magnitudePerLevel * skillLevel) / 100), 1);
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
