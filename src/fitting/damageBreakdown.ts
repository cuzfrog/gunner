import type { TypeId } from "../gamedata/ids";
import type { ChargeStats, DroneStats, MissileStats } from "../gamedata/fittingDb";
import type { DamageType } from "../sim";

export type DamageFactorKind = "base" | "module" | "skill" | "hull" | "overload";

export interface DamageFactor {
  readonly kind: DamageFactorKind;
  readonly multiplier: number;
  readonly moduleIds?: readonly TypeId[];
  readonly skillIds?: readonly TypeId[];
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

export function droneDamageByType(stats: DroneStats): Partial<Record<DamageType, number>> {
  const result: Partial<Record<DamageType, number>> = {};
  if (stats.emDamage > 0) result.em = stats.emDamage;
  if (stats.thermalDamage > 0) result.thermal = stats.thermalDamage;
  if (stats.kineticDamage > 0) result.kinetic = stats.kineticDamage;
  if (stats.explosiveDamage > 0) result.explosive = stats.explosiveDamage;
  return result;
}
