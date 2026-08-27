import type { SigResolutionClass } from "../sim";
import { SIG_RESOLUTIONS } from "../sim";
import type { SkillLevel } from "../ships";
import type { TurretStats } from "../gamedata/fittingDb";
import type { ImportedTurretBase } from "./chargeCatalog";

export const TRACKING_SKILL_BONUS = 0.05;
export const OPTIMAL_SKILL_BONUS = 0.05;
export const FALLOFF_SKILL_BONUS = 0.05;
export const STANDARD_SIGNATURE_RESOLUTION = 40_000;

export function sigResolutionClassFromChargeSize(chargeSize: number): SigResolutionClass {
  if (chargeSize >= 4) return "XL";
  if (chargeSize === 3) return "L";
  if (chargeSize === 2) return "M";
  return "S";
}

export function applySkillMultipliers(stats: TurretStats, sigResClass: SigResolutionClass, skillLevel: SkillLevel): ImportedTurretBase {
  const sigRes = SIG_RESOLUTIONS[sigResClass];
  const skillTrackingMultiplier = 1 + TRACKING_SKILL_BONUS * skillLevel;
  const skillOptimalMultiplier = 1 + OPTIMAL_SKILL_BONUS * skillLevel;
  const skillFalloffMultiplier = 1 + FALLOFF_SKILL_BONUS * skillLevel;
  return {
    tracking: (stats.tracking * skillTrackingMultiplier * sigRes) / STANDARD_SIGNATURE_RESOLUTION,
    optimal: stats.optimal * skillOptimalMultiplier,
    falloff: stats.falloff * skillFalloffMultiplier,
  };
}
