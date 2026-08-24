import type { StackingPenalty } from "./stackingPenalty";
import type { EwarProjection, StasisGrapplerSpec, StasisWebSpec, TrackingDisruptorSpec, TurretSpec } from "./types";

export interface EwarResolver {
  speedMultiplier(projection: EwarProjection | undefined, distance: number): number;
  disruptedTurret(turret: TurretSpec, projection: EwarProjection | undefined, distance: number): TurretSpec;
  propulsionSuppressed(projection: EwarProjection | undefined, distance: number): boolean;
}

export class EwarResolverImpl implements EwarResolver {
  private readonly stacking: StackingPenalty;

  constructor({ stackingPenalty }: { stackingPenalty: StackingPenalty }) {
    this.stacking = stackingPenalty;
  }

  speedMultiplier(projection: EwarProjection | undefined, distance: number): number {
    if (!projection) return 1;
    const multipliers: number[] = [];
    for (let i = 0; i < projection.loadout.webs.length; i++) {
      const spec = projection.loadout.webs[i];
      const activation = projection.activation?.webs[i];
      if (activation && !activation.active) continue;
      const overloadBonus = activation?.overloaded ? 1 + spec.overloadRangeBonusPercent / 100 : 1;
      const range = spec.maxRange * overloadBonus;
      if (range >= distance) multipliers.push(1 - spec.speedFactor);
    }
    for (let i = 0; i < projection.loadout.grapplers.length; i++) {
      const spec = projection.loadout.grapplers[i];
      const activation = projection.activation?.grapplers[i];
      if (activation && !activation.active) continue;
      const overloadBonus = activation?.overloaded ? 1 + spec.overloadOptimalBonusPercent / 100 : 1;
      const optimal = spec.optimal * overloadBonus;
      const effectiveness = this.falloffEffectiveness(distance, optimal, spec.falloff);
      if (effectiveness > 0) multipliers.push(1 - spec.speedFactor * effectiveness);
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
      const activation = projection.activation?.disruptors[i];
      if (activation && !activation.active) continue;

      const overloadBonus = activation?.overloaded ? 1 + spec.overloadStrengthBonusPercent / 100 : 1;
      const strength = spec.disruption * overloadBonus;
      const effectiveness = this.disruptorEffectiveness(distance, spec);
      const script = activation?.script ?? spec.defaultScript;
      const trackingEffect = strength * (script?.trackingMultiplier ?? 1);
      const optimalEffect = strength * (script?.optimalMultiplier ?? 1);
      const falloffEffect = strength * (script?.falloffMultiplier ?? 1);

      if (trackingEffect > 0) trackingModifiers.push(1 - trackingEffect * effectiveness);
      if (optimalEffect > 0) optimalModifiers.push(1 - optimalEffect * effectiveness);
      if (falloffEffect > 0) falloffModifiers.push(1 - falloffEffect * effectiveness);
    }

    return {
      tracking: turret.tracking * this.stacking.apply(trackingModifiers),
      optimal: turret.optimal * this.stacking.apply(optimalModifiers),
      falloff: turret.falloff * this.stacking.apply(falloffModifiers),
      sigResolution: turret.sigResolution,
    };
  }

  propulsionSuppressed(projection: EwarProjection | undefined, distance: number): boolean {
    if (!projection) return false;
    const scramblers = projection.loadout.scramblers;
    for (let i = 0; i < scramblers.length; i++) {
      const spec = scramblers[i];
      const activation = projection.activation?.scramblers[i];
      if (activation && !activation.active) continue;
      const overloadBonus = activation?.overloaded ? 1 + spec.overloadRangeBonusPercent / 100 : 1;
      const range = spec.maxRange * overloadBonus;
      if (range >= distance) return true;
    }
    return false;
  }

  private disruptorEffectiveness(distance: number, spec: TrackingDisruptorSpec): number {
    return this.falloffEffectiveness(distance, spec.optimal, spec.falloff);
  }

  private falloffEffectiveness(distance: number, optimal: number, falloff: number): number {
    if (distance <= optimal) return 1;
    if (falloff === 0) return 0;
    const ratio = (distance - optimal) / falloff;
    return 0.5 ** (ratio * ratio);
  }
}
