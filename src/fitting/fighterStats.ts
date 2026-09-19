import type { FighterStats, HullBonus, SkillBonus } from "../gamedata/fittingDb";
import { type TypeId } from "../gamedata/ids";
import type { SkillLevel } from "../ships";

export interface FighterSkillOutput {
  // Total damage multiplier: fighter base damage multiplier times skill and hull contributions.
  readonly damageMultiplier: number;
  readonly skillDamageMultiplier: number;
  readonly skillDamageIds: readonly TypeId[];
  // Ship hull multiplier from fighterDamage bonuses (carrier and supercarrier hulls).
  readonly hullDamageMultiplier: number;
  readonly maxVelocity: number;
  readonly optimalMultiplier: number;
}

export interface FighterSkillModel {
  compute(fighter: FighterStats, hullBonuses: readonly HullBonus[], skillLevel: SkillLevel): FighterSkillOutput;
}

interface FighterSkillModelDeps {
  readonly skillBonuses: readonly SkillBonus[];
}

export class FighterSkillModelImpl implements FighterSkillModel {
  private readonly fighterSkillBonuses: readonly (SkillBonus & { readonly requiredSkillId: TypeId })[];

  constructor({ skillBonuses }: FighterSkillModelDeps) {
    this.fighterSkillBonuses = skillBonuses.filter(isChainScopedFighterBonus);
  }

  compute(fighter: FighterStats, hullBonuses: readonly HullBonus[], skillLevel: SkillLevel): FighterSkillOutput {
    const matching = this.fighterSkillBonuses.filter((b) => fighter.requiredSkillIds.includes(b.requiredSkillId));
    const damageBonuses = matching.filter((b) => b.bonusType === "fighterDamage");
    const skillDamageMultiplier = multiplyPerLevel(damageBonuses, skillLevel);
    const skillDamageIds = damageBonuses.map((b) => b.skillId);
    const optimalMultiplier = multiplyPerLevel(matching.filter((b) => b.bonusType === "fighterOptimal"), skillLevel);
    const velocityMultiplier = multiplyPerLevel(matching.filter((b) => b.bonusType === "fighterVelocity"), skillLevel);

    // Only unsourced (ship) bonuses apply; subsystems never emit fighterDamage rows.
    const hullDamageMultiplier = hullBonuses
      .filter((b) => b.attribute === "fighterDamage" && b.sourceId === undefined && (b.chargeSkillId === undefined || fighter.requiredSkillIds.includes(b.chargeSkillId)))
      .reduce((acc, b) => acc * (1 + (b.magnitude * (b.scalesWithHullSkill ? skillLevel : 1)) / 100), 1);

    const baseDamageMultiplier = fighter.attack?.damageMultiplier ?? 1;
    return {
      damageMultiplier: baseDamageMultiplier * skillDamageMultiplier * hullDamageMultiplier,
      skillDamageMultiplier,
      skillDamageIds,
      hullDamageMultiplier,
      maxVelocity: fighter.maxVelocity * velocityMultiplier,
      optimalMultiplier,
    };
  }
}

const FIGHTER_BONUS_TYPES = ["fighterDamage", "fighterOptimal", "fighterVelocity"] as const;

function isChainScopedFighterBonus(bonus: SkillBonus): bonus is SkillBonus & { readonly requiredSkillId: TypeId } {
  return (FIGHTER_BONUS_TYPES as readonly string[]).includes(bonus.bonusType) && bonus.requiredSkillId !== undefined;
}

function multiplyPerLevel(bonuses: readonly SkillBonus[], skillLevel: SkillLevel): number {
  return bonuses.reduce((acc, b) => acc * (1 + (b.magnitudePerLevel * skillLevel) / 100), 1);
}
