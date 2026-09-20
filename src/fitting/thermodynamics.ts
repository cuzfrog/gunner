import type { SkillLevel } from "../ships";

/**
 * Thermodynamics skill multiplier for module heat damage: -5% per skill level
 * (pyfa thermodynamicsSkillDamageBonus: filteredItemBoost with attr 1229 = -5 per level).
 */
export function thermodynamicsHeatFactor(skillLevel: SkillLevel): number {
  return 1 - 0.05 * skillLevel;
}
