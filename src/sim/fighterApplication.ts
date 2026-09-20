import type { MissileApplication } from "./missileApplication";
import type { WeaponDamageAssessor } from "./weaponDamageAssessor";
import type { DamageAssessment, FighterDamageBreakdown, FighterSpec, MissileSpec } from "./types";

export interface FighterApplication {
  compute(fighter: FighterSpec, targetSpeed: number, distance: number, paintedTargetSig: number, aliveCount?: number): FighterDamageBreakdown & DamageAssessment;
}

interface FighterApplicationDeps {
  readonly missileApplication: MissileApplication;
  readonly weaponDamageAssessor: WeaponDamageAssessor;
}

export class FighterApplicationImpl implements FighterApplication {
  private readonly missileApplication: MissileApplication;
  private readonly weaponDamageAssessor: WeaponDamageAssessor;

  constructor(deps: FighterApplicationDeps) {
    this.missileApplication = deps.missileApplication;
    this.weaponDamageAssessor = deps.weaponDamageAssessor;
  }

  compute(fighter: FighterSpec, targetSpeed: number, distance: number, paintedTargetSig: number, aliveCount?: number): FighterDamageBreakdown & DamageAssessment {
    const rangeFactor = fighterRangeFactor(fighter, targetSpeed, distance);
    const explosion = this.missileApplication.compute(missileView(fighter), targetSpeed, paintedTargetSig);
    const application = rangeFactor * explosion.application;
    const aliveMultiplier = aliveCount !== undefined && fighter.fighterCount > 0 ? aliveCount / fighter.fighterCount : 1;
    const damage = this.weaponDamageAssessor.assess(fighter, application, true, aliveMultiplier);
    return { ...damage, rangeFactor, signatureTerm: explosion.signatureTerm, velocityTerm: explosion.velocityTerm, inRange: rangeFactor > 0 };
  }
}

/** pyfa getFighterAbilityMult: faster fighters apply at full strength regardless of distance; slower ones fall back to the range factor evaluated at the ship-to-target distance. */
function fighterRangeFactor(fighter: FighterSpec, targetSpeed: number, distance: number): number {
  if (fighter.maxVelocity >= targetSpeed) return 1;
  return calculateRangeFactor(fighter.optimal, fighter.falloff, distance);
}

/** eos calculateRangeFactor with restrictedRange: hard cut beyond optimal + 3*falloff, falloff curve in between. */
function calculateRangeFactor(optimal: number, falloff: number, distance: number): number {
  if (falloff > 0) {
    if (distance > optimal + 3 * falloff) return 0;
    return 0.5 ** ((Math.max(0, distance - optimal) / falloff) ** 2);
  }
  return distance <= optimal ? 1 : 0;
}

/** Fighters share the missile explosion math: the fighter attack presents the MissileSpec surface MissileApplication consumes. */
function missileView(fighter: FighterSpec): MissileSpec {
  return { kind: "missile", moduleId: fighter.moduleId, damagePerMissile: fighter.damagePerVolley, cycleTime: fighter.cycleTime, launcherCount: fighter.fighterCount, explosionRadius: fighter.explosionRadius, explosionVelocity: fighter.explosionVelocity, damageReductionFactor: fighter.damageReductionFactor, maxVelocity: 0, flightTime: 0, flightRange: 0 };
}
