import type { HullBonus, LauncherStats, MissileStats } from "../gamedata/fittingDb";
import { toTypeId, type TypeId } from "../gamedata/ids";
import { type DamageVector, type StackingPenalty, damageVectorFromPartial, damageVectorScale } from "../sim";
import type { SkillLevel } from "../ships";
import { missileDamageByType } from "./damageBreakdown";

export interface MissileSkillOutput {
  readonly damagePerMissile: DamageVector;
  readonly cycleTime: number;
  readonly explosionRadius: number;
  readonly explosionVelocity: number;
  readonly damageReductionFactor: number;
  readonly maxVelocity: number;
  readonly flightTime: number;
  readonly skillDamageMultiplier: number;
  readonly skillDamageId: TypeId;
  readonly hullDamageMultiplier: number;
}

export interface MissileSkillModel {
  compute(launcher: LauncherStats, missile: MissileStats, hullBonuses: readonly HullBonus[], skillLevel: SkillLevel): MissileSkillOutput;
}

const MLO_ROF_BONUS = 0.02;
const RAPID_LAUNCH_ROF_BONUS = 0.03;
const WARHEAD_DAMAGE_BONUS = 0.02;
const WARHEAD_UPGRADES_ID = toTypeId("20315");
const MISSILE_BOMBARDMENT_FLIGHT_BONUS = 0.10;
const MISSILE_PROJECTION_VELOCITY_BONUS = 0.10;
const GUIDED_PRECISION_RADIUS_BONUS = 0.05;
const TARGET_NAV_VELOCITY_BONUS = 0.10;

interface MissileSkillModelDeps {
  readonly stackingPenalty: StackingPenalty;
}

export class MissileSkillModelImpl implements MissileSkillModel {
  private readonly stacking: StackingPenalty;

  constructor({ stackingPenalty }: MissileSkillModelDeps) {
    this.stacking = stackingPenalty;
  }

  compute(launcher: LauncherStats, missile: MissileStats, hullBonuses: readonly HullBonus[], skillLevel: SkillLevel): MissileSkillOutput {
    const skillRofMultiplier = (1 - MLO_ROF_BONUS * skillLevel) * (1 - RAPID_LAUNCH_ROF_BONUS * skillLevel);
    const skillDamageMultiplier = 1 + WARHEAD_DAMAGE_BONUS * skillLevel;
    const skillExplosionRadiusMultiplier = 1 - GUIDED_PRECISION_RADIUS_BONUS * skillLevel;
    const skillExplosionVelocityMultiplier = 1 + TARGET_NAV_VELOCITY_BONUS * skillLevel;
    const skillMaxVelocityMultiplier = 1 + MISSILE_PROJECTION_VELOCITY_BONUS * skillLevel;
    const skillFlightTimeMultiplier = 1 + MISSILE_BOMBARDMENT_FLIGHT_BONUS * skillLevel;

    const matchingBonuses = hullBonuses.filter((b) => hullBonusMatchesLauncher(b, launcher, missile));
    const damagePercent = matchingBonuses.filter((b) => b.attribute === "missileDamage").map((b) => b.magnitude * (b.scalesWithHullSkill ? skillLevel : 1) / 100);
    const rofPercent = matchingBonuses.filter((b) => b.attribute === "missileRoF").map((b) => b.magnitude * (b.scalesWithHullSkill ? skillLevel : 1) / 100);
    const velocityPercent = matchingBonuses.filter((b) => b.attribute === "missileVelocity").map((b) => b.magnitude * (b.scalesWithHullSkill ? skillLevel : 1) / 100);
    const flightTimePercent = matchingBonuses.filter((b) => b.attribute === "missileFlightTime").map((b) => b.magnitude * (b.scalesWithHullSkill ? skillLevel : 1) / 100);

    const hullDamageMultiplier = damagePercent.length > 0 ? this.stacking.apply(damagePercent.map((p) => 1 + p)) : 1;
    const hullRofMultiplier = rofPercent.length > 0 ? this.stacking.apply(rofPercent.map((p) => 1 + p)) : 1;
    const hullVelocityMultiplier = velocityPercent.length > 0 ? this.stacking.apply(velocityPercent.map((p) => 1 + p)) : 1;
    const hullFlightTimeMultiplier = flightTimePercent.length > 0 ? this.stacking.apply(flightTimePercent.map((p) => 1 + p)) : 1;

    const damageMultiplier = skillDamageMultiplier * hullDamageMultiplier;
    return {
      damagePerMissile: damageVectorScale(damageVectorFromPartial(missileDamageByType(missile)), damageMultiplier),
      cycleTime: launcher.rateOfFire * skillRofMultiplier * hullRofMultiplier,
      explosionRadius: missile.explosionRadius * skillExplosionRadiusMultiplier,
      explosionVelocity: missile.explosionVelocity * skillExplosionVelocityMultiplier,
      damageReductionFactor: missile.damageReductionFactor,
      maxVelocity: missile.maxVelocity * skillMaxVelocityMultiplier * hullVelocityMultiplier,
      flightTime: missile.flightTime * skillFlightTimeMultiplier * hullFlightTimeMultiplier,
      skillDamageMultiplier,
      skillDamageId: WARHEAD_UPGRADES_ID,
      hullDamageMultiplier,
    };
  }
}

function hullBonusMatchesLauncher(bonus: HullBonus, launcher: LauncherStats, missile: MissileStats): boolean {
  if (bonus.moduleGroupId !== undefined && bonus.moduleGroupId !== launcher.launcherGroup) return false;
  if (bonus.moduleSkillId !== undefined && !launcher.requiredSkillIds.includes(bonus.moduleSkillId)) return false;
  if (bonus.chargeSkillId !== undefined && !missile.requiredSkillIds.includes(bonus.chargeSkillId)) return false;
  return true;
}
