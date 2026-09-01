import type { MissileApplicationResult, MissileSpec } from "./types";

export interface MissileApplication {
  compute(missile: MissileSpec, targetSpeed: number, opponentSigRadius: number): MissileApplicationResult;
}

export class MissileApplicationImpl implements MissileApplication {
  compute(missile: MissileSpec, targetSpeed: number, opponentSigRadius: number): MissileApplicationResult {
    const signatureTerm = opponentSigRadius > 0 && missile.explosionRadius > 0
      ? opponentSigRadius / missile.explosionRadius
      : 1;
    const velocityTerm = computeVelocityTerm(signatureTerm, missile, targetSpeed);
    const application = Math.min(1, signatureTerm, velocityTerm);
    return { application, signatureTerm, velocityTerm };
  }
}

function computeVelocityTerm(signatureTerm: number, missile: MissileSpec, targetSpeed: number): number {
  if (targetSpeed <= 0) return 1;
  if (missile.explosionVelocity <= 0) return 0;
  const ratio = (signatureTerm * missile.explosionVelocity) / targetSpeed;
  const drf = missile.damageReductionFactor > 0 ? missile.damageReductionFactor : 1;
  return ratio ** drf;
}
