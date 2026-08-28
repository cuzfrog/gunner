import type { EngagementFrame, MissileDamageBreakdown, MissileSpec, ShipState } from "./types";

export interface MissileApplication {
  compute(frame: EngagementFrame, missile: MissileSpec, opponent: ShipState, opponentSigRadius: number): MissileDamageBreakdown;
}

export class MissileApplicationImpl implements MissileApplication {
  compute(frame: EngagementFrame, missile: MissileSpec, opponent: ShipState, opponentSigRadius: number): MissileDamageBreakdown {
    const targetSpeed = opponent.velocity.len();
    const inRange = frame.distance <= missile.flightRange;
    const timeToImpact = missile.maxVelocity > 0 ? frame.distance / missile.maxVelocity : 0;
    const signatureTerm = opponentSigRadius > 0 && missile.explosionRadius > 0
      ? opponentSigRadius / missile.explosionRadius
      : 1;
    const velocityTerm = computeVelocityTerm(signatureTerm, missile, targetSpeed);
    const application = Math.min(1, signatureTerm, velocityTerm);
    return { application, signatureTerm, velocityTerm, inRange, timeToImpact };
  }
}

function computeVelocityTerm(signatureTerm: number, missile: MissileSpec, targetSpeed: number): number {
  if (targetSpeed <= 0) return 1;
  if (missile.explosionVelocity <= 0) return 0;
  const ratio = (signatureTerm * missile.explosionVelocity) / targetSpeed;
  const drfNorm = missile.damageReductionFactor > 0
    ? Math.log(missile.damageReductionFactor) / Math.log(5.5)
    : 1;
  return ratio ** drfNorm;
}
