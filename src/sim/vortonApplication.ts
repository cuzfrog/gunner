import type { MissileApplication } from "./missileApplication";
import type { WeaponDamageAssessor } from "./weaponDamageAssessor";
import type { DamageAssessment, MissileSpec, VortonDamageBreakdown, VortonSpec } from "./types";

export interface VortonApplication {
  compute(vorton: VortonSpec, distance: number, targetSpeed: number, paintedTargetSig: number): VortonDamageBreakdown & DamageAssessment;
}

interface VortonApplicationDeps {
  readonly missileApplication: MissileApplication;
  readonly weaponDamageAssessor: WeaponDamageAssessor;
}

/** pyfa getVortonMult: calculateRangeFactor(maxRange, 0, distance) x _calcMissileFactor — a hard range cutoff times the missile explosion formula, no hit roll. */
export class VortonApplicationImpl implements VortonApplication {
  private readonly missileApplication: MissileApplication;
  private readonly weaponDamageAssessor: WeaponDamageAssessor;

  constructor(deps: VortonApplicationDeps) {
    this.missileApplication = deps.missileApplication;
    this.weaponDamageAssessor = deps.weaponDamageAssessor;
  }

  compute(vorton: VortonSpec, distance: number, targetSpeed: number, paintedTargetSig: number): VortonDamageBreakdown & DamageAssessment {
    const explosion = this.missileApplication.compute(explosionView(vorton), targetSpeed, paintedTargetSig);
    const inRange = distance <= vorton.maxRange;
    const damage = this.weaponDamageAssessor.assess(vorton, explosion.application, inRange);
    return { ...damage, application: damage.application, signatureTerm: explosion.signatureTerm, velocityTerm: explosion.velocityTerm, inRange };
  }
}

/** Vortons share the missile explosion math: the projector presents the MissileSpec surface MissileApplication consumes. */
function explosionView(vorton: VortonSpec): MissileSpec {
  return { kind: "missile", moduleId: vorton.moduleId, damagePerMissile: vorton.damagePerShot, cycleTime: vorton.cycleTime, launcherCount: vorton.count, explosionRadius: vorton.explosionRadius, explosionVelocity: vorton.explosionVelocity, damageReductionFactor: vorton.damageReductionFactor, maxVelocity: 0, flightTime: 0, flightRange: 0 };
}
