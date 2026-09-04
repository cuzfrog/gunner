import type { DamageAssessment, DamageVector, WeaponSpec } from "./types";
import { ZERO_DAMAGE, damageVectorScale, damageVectorSum } from "./types";

export interface WeaponDamageAssessor {
  assess(spec: WeaponSpec, applicationFactor: number, inRange: boolean): DamageAssessment;
}

export class WeaponDamageAssessorImpl implements WeaponDamageAssessor {
  assess(spec: WeaponSpec, applicationFactor: number, inRange: boolean): DamageAssessment {
    const baseVolleyByType = computeBaseVolley(spec);
    const volley = damageVectorSum(baseVolleyByType);
    const nominalDps = spec.cycleTime > 0 ? volley / spec.cycleTime : 0;
    const effectiveApplication = inRange ? applicationFactor : 0;
    const appliedVolleyByType = damageVectorScale(baseVolleyByType, effectiveApplication);
    const appliedByType = spec.cycleTime > 0 ? damageVectorScale(appliedVolleyByType, 1 / spec.cycleTime) : ZERO_DAMAGE;
    const appliedDps = damageVectorSum(appliedByType);
    return { nominalDps, appliedDps, application: effectiveApplication, volley, baseVolleyByType, appliedByType, appliedVolleyByType };
  }
}

function computeBaseVolley(spec: WeaponSpec): DamageVector {
  if (spec.kind === "turret") return damageVectorScale(spec.damagePerShot, spec.turretCount);
  if (spec.kind === "missile") return damageVectorScale(spec.damagePerMissile, spec.launcherCount);
  return damageVectorScale(spec.damagePerShot, spec.droneCount);
}
