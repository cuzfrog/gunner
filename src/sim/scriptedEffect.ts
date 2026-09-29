/**
 * Canonical script-scaling math for scripted modules: every consumer (sim resolvers,
 * module hover hints) derives a script's effective per-component values through these
 * pure functions so the base-times-multiplier rules exist exactly once.
 */

export interface TrackingScriptMultipliers {
  readonly trackingMultiplier: number;
  readonly optimalMultiplier: number;
  readonly falloffMultiplier: number;
}

export interface SensorScriptMultipliers {
  readonly scanResolutionMultiplier: number;
  readonly maxTargetRangeMultiplier: number;
}

export interface MissileScriptMultipliers {
  readonly explosionRadiusMultiplier: number;
  readonly explosionVelocityMultiplier: number;
  readonly missileVelocityMultiplier: number;
  readonly flightTimeMultiplier: number;
}

export interface TrackingEffectPercents {
  readonly trackingPercent: number;
  readonly optimalPercent: number;
  readonly falloffPercent: number;
}

export interface SensorEffectPercents {
  readonly scanResolutionPercent: number;
  readonly maxTargetRangePercent: number;
}

export interface MissileEffectPercents {
  readonly explosionRadiusPercent: number;
  readonly explosionVelocityPercent: number;
  readonly missileVelocityPercent: number;
  readonly flightTimePercent: number;
}

export function disruptionEffectStrengths(strengthPercent: number, script: TrackingScriptMultipliers | undefined): TrackingEffectPercents {
  return trackingEffectPercents(strengthPercent, strengthPercent, strengthPercent, script);
}

export function trackingEffectPercents(trackingPercent: number, optimalPercent: number, falloffPercent: number, script: TrackingScriptMultipliers | undefined): TrackingEffectPercents {
  return {
    trackingPercent: trackingPercent * (script?.trackingMultiplier ?? 1),
    optimalPercent: optimalPercent * (script?.optimalMultiplier ?? 1),
    falloffPercent: falloffPercent * (script?.falloffMultiplier ?? 1),
  };
}

export function sensorEffectPercents(scanResolutionPercent: number, maxTargetRangePercent: number, script: SensorScriptMultipliers | undefined): SensorEffectPercents {
  return {
    scanResolutionPercent: scanResolutionPercent * (script?.scanResolutionMultiplier ?? 1),
    maxTargetRangePercent: maxTargetRangePercent * (script?.maxTargetRangeMultiplier ?? 1),
  };
}

export function missileEffectPercents(explosionRadiusPercent: number, explosionVelocityPercent: number, missileVelocityPercent: number, flightTimePercent: number, script: MissileScriptMultipliers | undefined): MissileEffectPercents {
  return {
    explosionRadiusPercent: explosionRadiusPercent * (script?.explosionRadiusMultiplier ?? 1),
    explosionVelocityPercent: explosionVelocityPercent * (script?.explosionVelocityMultiplier ?? 1),
    missileVelocityPercent: missileVelocityPercent * (script?.missileVelocityMultiplier ?? 1),
    flightTimePercent: flightTimePercent * (script?.flightTimeMultiplier ?? 1),
  };
}
