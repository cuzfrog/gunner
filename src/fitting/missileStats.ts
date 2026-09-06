import type { HullBonus, LauncherStats, MissileBonusAttribute, MissileStats, SkillBonus } from "../gamedata/fittingDb";
import { type TypeId } from "../gamedata/ids";
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
  readonly skillDamageIds: readonly TypeId[];
  readonly hullDamageMultiplier: number;
}

export interface MissileSkillModel {
  compute(launcher: LauncherStats, missile: MissileStats, hullBonuses: readonly HullBonus[], skillLevel: SkillLevel): MissileSkillOutput;
}

interface MissileSkillModelDeps {
  readonly stackingPenalty: StackingPenalty;
  readonly skillBonuses: readonly SkillBonus[];
}

export class MissileSkillModelImpl implements MissileSkillModel {
  private readonly stacking: StackingPenalty;
  private readonly skillBonuses: readonly SkillBonus[];

  constructor({ stackingPenalty, skillBonuses }: MissileSkillModelDeps) {
    this.stacking = stackingPenalty;
    this.skillBonuses = skillBonuses;
  }

  compute(launcher: LauncherStats, missile: MissileStats, hullBonuses: readonly HullBonus[], skillLevel: SkillLevel): MissileSkillOutput {
    const matchingSkillBonuses = this.skillBonuses.filter((b) => skillBonusMatches(b, launcher, missile));
    const skillDamageMultiplier = multiplySkillBonuses(matchingSkillBonuses, "missileDamage", skillLevel);
    const skillRofMultiplier = multiplySkillBonuses(matchingSkillBonuses, "missileRoF", skillLevel);
    const skillVelocityMultiplier = multiplySkillBonuses(matchingSkillBonuses, "missileVelocity", skillLevel);
    const skillFlightTimeMultiplier = multiplySkillBonuses(matchingSkillBonuses, "missileFlightTime", skillLevel);
    const skillExplosionRadiusMultiplier = multiplySkillBonuses(matchingSkillBonuses, "missileExplosionRadius", skillLevel);
    const skillExplosionVelocityMultiplier = multiplySkillBonuses(matchingSkillBonuses, "missileExplosionVelocity", skillLevel);
    const skillDamageIds = matchingSkillBonuses.filter((b) => b.bonusType === "missileDamage" && b.magnitudePerLevel !== 0).map((b) => b.skillId);

    const matchingHullBonuses = hullBonuses.filter((b) => hullBonusMatchesLauncher(b, launcher, missile));
    const hullDamageMultiplier = hullStackingMultiplier(this.stacking, matchingHullBonuses, "missileDamage", skillLevel);
    const hullRofMultiplier = hullStackingMultiplier(this.stacking, matchingHullBonuses, "missileRoF", skillLevel);
    const hullVelocityMultiplier = hullStackingMultiplier(this.stacking, matchingHullBonuses, "missileVelocity", skillLevel);
    const hullFlightTimeMultiplier = hullStackingMultiplier(this.stacking, matchingHullBonuses, "missileFlightTime", skillLevel);
    const hullExplosionRadiusMultiplier = hullStackingMultiplier(this.stacking, matchingHullBonuses, "missileExplosionRadius", skillLevel);
    const hullExplosionVelocityMultiplier = hullStackingMultiplier(this.stacking, matchingHullBonuses, "missileExplosionVelocity", skillLevel);

    const damageMultiplier = skillDamageMultiplier * hullDamageMultiplier;
    return {
      damagePerMissile: damageVectorScale(damageVectorFromPartial(missileDamageByType(missile)), damageMultiplier),
      cycleTime: launcher.rateOfFire * skillRofMultiplier * hullRofMultiplier,
      explosionRadius: missile.explosionRadius * skillExplosionRadiusMultiplier * hullExplosionRadiusMultiplier,
      explosionVelocity: missile.explosionVelocity * skillExplosionVelocityMultiplier * hullExplosionVelocityMultiplier,
      damageReductionFactor: missile.damageReductionFactor,
      maxVelocity: missile.maxVelocity * skillVelocityMultiplier * hullVelocityMultiplier,
      flightTime: missile.flightTime * skillFlightTimeMultiplier * hullFlightTimeMultiplier,
      skillDamageMultiplier,
      skillDamageIds,
      hullDamageMultiplier,
    };
  }
}

function skillBonusMatches(bonus: SkillBonus, launcher: LauncherStats, missile: MissileStats): boolean {
  if (bonus.appliesTo === "module") {
    if (bonus.requiredSkillId !== undefined && !launcher.requiredSkillIds.includes(bonus.requiredSkillId)) return false;
    if (bonus.moduleGroupId !== undefined && bonus.moduleGroupId !== launcher.launcherGroup) return false;
  } else {
    if (bonus.requiredSkillId !== undefined && !missile.requiredSkillIds.includes(bonus.requiredSkillId)) return false;
  }
  return true;
}

function multiplySkillBonuses(bonuses: readonly SkillBonus[], bonusType: SkillBonus["bonusType"], skillLevel: SkillLevel): number {
  let multiplier = 1;
  for (const bonus of bonuses) {
    if (bonus.bonusType !== bonusType) continue;
    multiplier *= 1 + (bonus.magnitudePerLevel * skillLevel) / 100;
  }
  return multiplier;
}

function hullStackingMultiplier(stacking: StackingPenalty, bonuses: readonly HullBonus[], attribute: MissileBonusAttribute, skillLevel: SkillLevel): number {
  const percents = bonuses.filter((b) => b.attribute === attribute).map((b) => b.magnitude * (b.scalesWithHullSkill ? skillLevel : 1) / 100);
  return percents.length > 0 ? stacking.apply(percents.map((p) => 1 + p)) : 1;
}

function hullBonusMatchesLauncher(bonus: HullBonus, launcher: LauncherStats, missile: MissileStats): boolean {
  if (bonus.moduleGroupId !== undefined && bonus.moduleGroupId !== launcher.launcherGroup) return false;
  if (bonus.moduleSkillId !== undefined && !launcher.requiredSkillIds.includes(bonus.moduleSkillId)) return false;
  if (bonus.chargeSkillId !== undefined && !missile.requiredSkillIds.includes(bonus.chargeSkillId)) return false;
  return true;
}
