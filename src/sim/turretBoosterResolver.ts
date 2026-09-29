import type { StackingPenalty } from "./stackingPenalty";
import { trackingEffectPercents } from "./scriptedEffect";
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
      if (!activation || !activation.active) continue;

      const script = activation.script;
      const scripted = trackingEffectPercents(spec.trackingBonusPercent, spec.optimalBonusPercent, spec.falloffBonusPercent, script);
      if (scripted.trackingPercent !== 0) tracking.push(1 + scripted.trackingPercent / 100);
      if (scripted.optimalPercent !== 0) optimal.push(1 + scripted.optimalPercent / 100);
      if (scripted.falloffPercent !== 0) falloff.push(1 + scripted.falloffPercent / 100);
    }

    return {
      ...turret,
      tracking: turret.tracking * this.stacking.apply(tracking),
      optimal: turret.optimal * this.stacking.apply(optimal),
      falloff: turret.falloff * this.stacking.apply(falloff),
    };
  }
}
