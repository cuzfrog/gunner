import { computeExpectedMultiplier } from "./expectedHitMultiplier";
import type { DamageAssessment, HitChanceBreakdown, TurretDamageBreakdown, TurretSpec } from "./types";

export interface TurretDamage {
  compute(hit: HitChanceBreakdown, turret: TurretSpec): TurretDamageBreakdown & DamageAssessment;
}

export class TurretDamageImpl implements TurretDamage {
  compute(hit: HitChanceBreakdown, turret: TurretSpec): TurretDamageBreakdown & DamageAssessment {
    const expectedMultiplier = computeExpectedMultiplier(hit.chance);
    const nominalDps = turret.cycleTime > 0 ? (turret.damagePerShot * turret.turretCount) / turret.cycleTime : 0;
    const appliedDps = nominalDps * expectedMultiplier;
    const volley = turret.damagePerShot * turret.turretCount;
    return { hit, expectedMultiplier, nominalDps, appliedDps, application: expectedMultiplier, volley };
  }
}
