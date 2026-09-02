import { computeExpectedMultiplier } from "./expectedHitMultiplier";
import type { DamageAssessment, HitChanceBreakdown, TurretDamageBreakdown, TurretSpec } from "./types";
import { damageVectorScale, damageVectorSum } from "./types";

export interface TurretDamage {
  compute(hit: HitChanceBreakdown, turret: TurretSpec): TurretDamageBreakdown & DamageAssessment;
}

export class TurretDamageImpl implements TurretDamage {
  compute(hit: HitChanceBreakdown, turret: TurretSpec): TurretDamageBreakdown & DamageAssessment {
    const expectedMultiplier = computeExpectedMultiplier(hit.chance);
    const shotDamage = damageVectorSum(turret.damagePerShot);
    const nominalDps = turret.cycleTime > 0 ? (shotDamage * turret.turretCount) / turret.cycleTime : 0;
    const appliedDps = nominalDps * expectedMultiplier;
    const volley = shotDamage * turret.turretCount;
    const appliedByType = damageVectorScale(turret.damagePerShot, (turret.turretCount * expectedMultiplier) / Math.max(turret.cycleTime, 0));
    return { hit, expectedMultiplier, nominalDps, appliedDps, application: expectedMultiplier, volley, appliedByType };
  }
}
