import type { RigDrawback, RigDrawbackReduction, SkillBonus, SkillBonusType } from "../gamedata/fittingDb";
import type { TypeId } from "../gamedata/ids";
import type { SkillLevel } from "../ships";

/** Multiplier a module with the given required skills receives from all matching skill bonuses (e.g. capacitor need or duration scaling). */
export function moduleSkillMultiplier(
  bonuses: readonly SkillBonus[],
  requiredSkillIds: readonly TypeId[],
  bonusType: SkillBonusType,
  skillLevel: SkillLevel,
  moduleGroupId?: number,
): number {
  let multiplier = 1;
  for (const bonus of bonuses) {
    if (bonus.bonusType !== bonusType) continue;
    if (bonus.appliesTo !== "module") continue;
    if (bonus.requiredSkillId !== undefined && !requiredSkillIds.includes(bonus.requiredSkillId)) continue;
    if (bonus.moduleGroupId !== undefined && bonus.moduleGroupId !== moduleGroupId) continue;
    multiplier *= 1 + (bonus.magnitudePerLevel * skillLevel) / 100;
  }
  return multiplier;
}

/** Percent remaining after the matching rigging skill reduces the rig's fitting drawback. */
export function applyRigDrawbackReduction(drawback: RigDrawback, reductions: readonly RigDrawbackReduction[], skillLevel: SkillLevel): number {
  let reductionPercent = 0;
  for (const reduction of reductions) {
    if (reduction.groupId === drawback.groupId) reductionPercent += reduction.magnitudePerLevel * skillLevel;
  }
  return drawback.percent * (1 + reductionPercent / 100);
}
