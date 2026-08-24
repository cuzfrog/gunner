import type { StackingPenalty } from "./stackingPenalty";
import type { TrackingBoosterSpec, TurretBoostProjection, TurretScriptSpec, TurretSpec } from "./types";

export interface TurretBoosterResolver {
  boostedTurret(turret: TurretSpec, projection: TurretBoostProjection | undefined): TurretSpec;
}

export class TurretBoosterResolverImpl implements TurretBoosterResolver {
  private readonly stacking: StackingPenalty;

  constructor({ stackingPenalty }: { stackingPenalty: StackingPenalty }) {
    this.stacking = stackingPenalty;
  }

  boostedTurret(turret: TurretSpec, projection: TurretBoostProjection | undefined): TurretSpec {
    if (!projection) return turret;
    const tracking: number[] = [];
    const optimal: number[] = [];
    const falloff: number[] = [];

    for (let i = 0; i < projection.loadout.computers.length; i++) {
      const spec = projection.loadout.computers[i];
      const activation = projection.activation?.computers[i];
      if (activation && !activation.active) continue;

      const script = activation?.script ?? spec.defaultScript;
      if (script !== undefined) {
        const trackingPercent = spec.trackingBonusPercent * script.trackingMultiplier;
        const optimalPercent = spec.optimalBonusPercent * script.optimalMultiplier;
        const falloffPercent = spec.falloffBonusPercent * script.falloffMultiplier;
        if (trackingPercent !== 0) tracking.push(1 + trackingPercent / 100);
        if (optimalPercent !== 0) optimal.push(1 + optimalPercent / 100);
        if (falloffPercent !== 0) falloff.push(1 + falloffPercent / 100);
      } else {
        if (spec.trackingBonusPercent !== 0) tracking.push(1 + spec.trackingBonusPercent / 100);
        if (spec.optimalBonusPercent !== 0) optimal.push(1 + spec.optimalBonusPercent / 100);
        if (spec.falloffBonusPercent !== 0) falloff.push(1 + spec.falloffBonusPercent / 100);
      }
    }

    return {
      tracking: turret.tracking * this.stacking.apply(tracking),
      optimal: turret.optimal * this.stacking.apply(optimal),
      falloff: turret.falloff * this.stacking.apply(falloff),
      sigResolution: turret.sigResolution,
    };
  }
}
