import type { TypeId } from "../gamedata/ids";
import type { ChargeStats, MissileStats } from "../gamedata/fittingDb";

export type DamageType = "em" | "thermal" | "kinetic" | "explosive";

export type DamageFactorKind = "base" | "module" | "skill" | "hull" | "overload";

export interface DamageFactor {
  readonly kind: DamageFactorKind;
  readonly multiplier: number;
  readonly moduleIds?: readonly TypeId[];
  readonly skillName?: string;
  readonly hullName?: string;
}

export interface DamageBreakdown {
  readonly damageByType: Readonly<Partial<Record<DamageType, number>>>;
  readonly factors: readonly DamageFactor[];
}

export const EMPTY_DAMAGE_BREAKDOWN: DamageBreakdown = { damageByType: {}, factors: [] };

export function chargeDamageByType(stats: ChargeStats): Partial<Record<DamageType, number>> {
  const result: Partial<Record<DamageType, number>> = {};
  if (stats.emDamage) result.em = stats.emDamage;
  if (stats.thermalDamage) result.thermal = stats.thermalDamage;
  if (stats.kineticDamage) result.kinetic = stats.kineticDamage;
  if (stats.explosiveDamage) result.explosive = stats.explosiveDamage;
  return result;
}

export function missileDamageByType(stats: MissileStats): Partial<Record<DamageType, number>> {
  return { [stats.damageType]: stats.damage };
}
