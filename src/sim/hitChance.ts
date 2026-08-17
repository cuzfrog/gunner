import type { EngagementFrame, HitChanceBreakdown, TurretSpec } from "./types.js";

export function computeHitChance(
  frame: EngagementFrame,
  turret: TurretSpec,
  targetSigRadius: number,
): HitChanceBreakdown {
  const { angularVelocity, distance } = frame;
  const { tracking, sigResolution, optimal, falloff } = turret;

  let trackingTerm = 0;
  if (tracking > 0 && targetSigRadius > 0) {
    trackingTerm =
      ((angularVelocity * sigResolution) / (tracking * targetSigRadius)) ** 2;
  } else if (angularVelocity > 0) {
    trackingTerm = Number.POSITIVE_INFINITY;
  }

  let rangeTerm = 0;
  if (distance > optimal) {
    if (falloff === 0) {
      rangeTerm = Number.POSITIVE_INFINITY;
    } else {
      rangeTerm = ((distance - optimal) / falloff) ** 2;
    }
  }

  const exponent = trackingTerm + rangeTerm;
  const chance = Number.isFinite(exponent) ? 0.5 ** exponent : 0;

  return { chance, trackingTerm, rangeTerm };
}

/**
 * Find the distance that maximizes hit chance for a target orbiting at
 * transversal speed `vt` (m/s) with the given turret and signature.
 *
 * The exponent being minimized is:
 *   E(d) = (A / d)^2 + ((max(0, d - optimal)) / falloff)^2
 * where A = (vt * sigRes) / (tracking * targetSig).
 */
export function findBestDistance(
  vt: number,
  turret: TurretSpec,
  targetSigRadius: number,
): number {
  const { tracking, sigResolution, optimal, falloff } = turret;

  if (vt <= 0 || tracking <= 0 || targetSigRadius <= 0 || falloff <= 0) {
    return optimal;
  }

  const A = (vt * sigResolution) / (tracking * targetSigRadius);
  if (Math.abs(A) < 1e-12) return optimal;

  // Newton's method on the derivative of E(d) for d >= optimal.
  let d = optimal + falloff;
  for (let i = 0; i < 20; i++) {
    const f = (d - optimal) / (falloff * falloff) - (A * A) / (d * d * d);
    const fp = 1 / (falloff * falloff) + (3 * A * A) / (d * d * d * d);
    const next = d - f / fp;
    if (!Number.isFinite(next)) return optimal;
    if (Math.abs(next - d) < 1e-3) {
      d = Math.max(optimal, next);
      break;
    }
    d = Math.max(optimal, next);
  }

  return d;
}
