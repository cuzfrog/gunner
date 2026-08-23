import type { StackingPenalty } from "./stackingPenalty";
import type { DisruptionScript, EwarProjection, StasisWebSpec, TrackingDisruptorSpec, TurretSpec } from "./types";

export interface EwarResolver {
  webSpeedMultiplier(projection: EwarProjection | undefined, distance: number): number;
  disruptedTurret(turret: TurretSpec, projection: EwarProjection | undefined, distance: number): TurretSpec;
}

export class EwarResolverImpl implements EwarResolver {
  private readonly stacking: StackingPenalty;

  constructor({ stackingPenalty }: { stackingPenalty: StackingPenalty }) {
    this.stacking = stackingPenalty;
  }

  webSpeedMultiplier(projection: EwarProjection | undefined, distance: number): number {
    if (!projection) return 1;
    const multipliers: number[] = [];
    for (let i = 0; i < projection.loadout.webs.length; i++) {
      const spec = projection.loadout.webs[i];
      const activation = projection.activation.webs[i];
      if (!activation?.active) continue;
      const overloadBonus = projection.overloaded ? 1 + spec.overloadRangeBonusPercent / 100 : 1;
      const range = spec.maxRange * overloadBonus;
      if (range >= distance) multipliers.push(1 - spec.speedFactor);
    }
    return this.stacking.apply(multipliers);
  }

  disruptedTurret(turret: TurretSpec, projection: EwarProjection | undefined, distance: number): TurretSpec {
    if (!projection) return turret;
    const trackingModifiers: number[] = [];
    const optimalModifiers: number[] = [];
    const falloffModifiers: number[] = [];

    for (let i = 0; i < projection.loadout.disruptors.length; i++) {
      const spec = projection.loadout.disruptors[i];
      const activation = projection.activation.disruptors[i];
      if (!activation?.active) continue;

      const overloadBonus = projection.overloaded ? 1 + spec.overloadStrengthBonusPercent / 100 : 1;
      const strength = spec.disruption * overloadBonus;
      const effectiveness = turretEffectiveness(distance, spec);
      const effects = scriptEffects(activation.script, strength);

      if (effects.tracking > 0) trackingModifiers.push(1 - effects.tracking * effectiveness);
      if (effects.optimal > 0) optimalModifiers.push(1 - effects.optimal * effectiveness);
      if (effects.falloff > 0) falloffModifiers.push(1 - effects.falloff * effectiveness);
    }

    return {
      tracking: turret.tracking * this.stacking.apply(trackingModifiers),
      optimal: turret.optimal * this.stacking.apply(optimalModifiers),
      falloff: turret.falloff * this.stacking.apply(falloffModifiers),
      sigResolution: turret.sigResolution,
    };
  }
}

interface ScriptEffects {
  readonly tracking: number;
  readonly optimal: number;
  readonly falloff: number;
}

function turretEffectiveness(distance: number, spec: TrackingDisruptorSpec): number {
  if (distance <= spec.optimal) return 1;
  if (spec.falloff === 0) return 0;
  const ratio = (distance - spec.optimal) / spec.falloff;
  return 0.5 ** (ratio * ratio);
}

function scriptEffects(script: DisruptionScript, disruption: number): ScriptEffects {
  switch (script) {
    case "optimalRange":
      return { tracking: 0, optimal: 2 * disruption, falloff: 2 * disruption };
    case "trackingSpeed":
      return { tracking: 2 * disruption, optimal: 0, falloff: 0 };
    default:
      return { tracking: disruption, optimal: disruption, falloff: disruption };
  }
}
