import type { EngagementFrame, HitChanceBreakdown, TrackingApplicationSpec } from "./types";

export interface HitChance {
  compute(frame: EngagementFrame, spec: TrackingApplicationSpec, opponentSigRadius: number): HitChanceBreakdown;
  findBestDistance(transversalSpeed: number, spec: TrackingApplicationSpec, opponentSigRadius: number): number;
}

export class HitChanceImpl implements HitChance {
  compute(frame: EngagementFrame, spec: TrackingApplicationSpec, opponentSigRadius: number): HitChanceBreakdown {
    const { angularVelocity, distance } = frame;
    const { tracking, sigResolution, optimal, falloff } = spec;

    let trackingTerm = 0;
    if (tracking > 0 && opponentSigRadius > 0) {
      trackingTerm = ((angularVelocity * sigResolution) / (tracking * opponentSigRadius)) ** 2;
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
    const trackingPenalty = Number.isFinite(trackingTerm) ? 0.5 ** trackingTerm : 0;
    const rangePenalty = Number.isFinite(rangeTerm) ? 0.5 ** rangeTerm : 0;

    return { chance, trackingTerm, rangeTerm, trackingPenalty, rangePenalty };
  }

  /**
   * Find the distance that maximizes hit chance for an opponent orbiting at
   * transversal speed `transversalSpeed` (m/s) with the given turret and signature.
   *
   * The exponent being minimized is:
   *   E(d) = (A / d)^2 + ((max(0, d - optimal)) / falloff)^2
   * where A = (transversalSpeed * sigRes) / (tracking * opponentSig).
   */
  findBestDistance(transversalSpeed: number, spec: TrackingApplicationSpec, opponentSigRadius: number): number {
    const { tracking, sigResolution, optimal, falloff } = spec;

    if (transversalSpeed <= 0 || tracking <= 0 || opponentSigRadius <= 0 || falloff <= 0) {
      return optimal;
    }

    const a = (transversalSpeed * sigResolution) / (tracking * opponentSigRadius);
    if (Math.abs(a) < 1e-12) return optimal;

    // Newton's method on the derivative of E(d) for d >= optimal.
    let d = optimal + falloff;
    for (let i = 0; i < 20; i++) {
      const f = (d - optimal) / (falloff * falloff) - (a * a) / (d * d * d);
      const fp = 1 / (falloff * falloff) + (3 * a * a) / (d * d * d * d);
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
}
