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
  // Whole-volley ship hull multiplier (damage bonuses not restricted to a damage type).
  readonly hullDamageMultiplier: number;
  // Ship hull multiplier restricted to the missile's damage type; undefined when no typed bonus applies.
  readonly hullTypedDamageMultiplier?: number;
  // Damage multipliers contributed by individual subsystems, for factor attribution.
  readonly subsystemDamageMultipliers?: readonly { readonly sourceId: TypeId; readonly multiplier: number; readonly typed: boolean }[];
}

export interface MissileSkillModel {
  compute(launcher: LauncherStats, missile: MissileStats, hullBonuses: readonly HullBonus[], skillLevel: SkillLevel): MissileSkillOutput;
}

/** Magazine size in missiles per full reload cycle: floor(capacity / volume) charges per launcher, floor-divided by the charge rate, scaled by the launcher count; undefined when the SDE lacks the data. */
export function missileMagazineShots(launcher: LauncherStats, missile: MissileStats, launcherCount: number): number | undefined {
  if (launcher.capacity === undefined || missile.volume === undefined || missile.volume <= 0) return undefined;
  const perLauncher = Math.floor(Math.floor(launcher.capacity / missile.volume) / (launcher.chargeRate ?? 1));
  if (perLauncher <= 0) return undefined;
  return perLauncher * launcherCount;
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
    const shipBonuses = matchingHullBonuses.filter((b) => b.sourceId === undefined);
    const hullDamageMultiplier = hullStackingMultiplier(this.stacking, shipBonuses.filter((b) => b.damageType === undefined), "missileDamage", skillLevel);
    const hullTypedDamageMultiplier = hullStackingMultiplier(this.stacking, shipBonuses.filter((b) => b.damageType !== undefined), "missileDamage", skillLevel);
    const subsystemDamageMultipliers = subsystemDamageMultipliersFrom(matchingHullBonuses, skillLevel);
    const hullRofMultiplier = hullStackingMultiplier(this.stacking, matchingHullBonuses, "missileRoF", skillLevel);
    const hullVelocityMultiplier = hullStackingMultiplier(this.stacking, matchingHullBonuses, "missileVelocity", skillLevel);
    const hullFlightTimeMultiplier = hullStackingMultiplier(this.stacking, matchingHullBonuses, "missileFlightTime", skillLevel);
    const hullExplosionRadiusMultiplier = hullStackingMultiplier(this.stacking, matchingHullBonuses, "missileExplosionRadius", skillLevel);
    const hullExplosionVelocityMultiplier = hullStackingMultiplier(this.stacking, matchingHullBonuses, "missileExplosionVelocity", skillLevel);

    const damageMultiplier = skillDamageMultiplier * hullDamageMultiplier * hullTypedDamageMultiplier * subsystemDamageMultipliers.reduce((acc, s) => acc * s.multiplier, 1);
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
      ...(hullTypedDamageMultiplier !== 1 ? { hullTypedDamageMultiplier } : {}),
      ...(subsystemDamageMultipliers.length > 0 ? { subsystemDamageMultipliers } : {}),
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

function subsystemDamageMultipliersFrom(bonuses: readonly HullBonus[], skillLevel: SkillLevel): readonly { readonly sourceId: TypeId; readonly multiplier: number; readonly typed: boolean }[] {
  const bySource = new Map<TypeId, { multiplier: number; typed: boolean }>();
  for (const bonus of bonuses) {
    if (bonus.sourceId === undefined || bonus.attribute !== "missileDamage") continue;
    const percent = (bonus.magnitude * (bonus.scalesWithHullSkill ? skillLevel : 1)) / 100;
    const existing = bySource.get(bonus.sourceId);
    if (existing) {
      existing.multiplier *= 1 + percent;
      existing.typed = existing.typed || bonus.damageType !== undefined;
    } else {
      bySource.set(bonus.sourceId, { multiplier: 1 + percent, typed: bonus.damageType !== undefined });
    }
  }
  return [...bySource.entries()].map(([sourceId, entry]) => ({ sourceId, multiplier: entry.multiplier, typed: entry.typed }));
}

function hullBonusMatchesLauncher(bonus: HullBonus, launcher: LauncherStats, missile: MissileStats): boolean {
  if (bonus.moduleGroupId !== undefined && bonus.moduleGroupId !== launcher.launcherGroup) return false;
  if (bonus.moduleSkillId !== undefined && !launcher.requiredSkillIds.includes(bonus.moduleSkillId)) return false;
  if (bonus.chargeSkillId !== undefined && !missile.requiredSkillIds.includes(bonus.chargeSkillId)) return false;
  if (bonus.damageType !== undefined && bonus.damageType !== missile.damageType) return false;
  return true;
}
