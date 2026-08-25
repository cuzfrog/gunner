import type { StackingPenalty } from "./stackingPenalty";
import type { EwarProjection, TrackingDisruptorSpec, TurretSpec } from "./types";

export interface EwarResolver {
  speedMultiplier(projection: EwarProjection | undefined, distance: number): number;
  speedMultiplierIgnoringRange(projection: EwarProjection | undefined): number;
  disruptedTurret(turret: TurretSpec, projection: EwarProjection | undefined, distance: number): TurretSpec;
  disruptedTurretIgnoringRange(turret: TurretSpec, projection: EwarProjection | undefined): TurretSpec;
  propulsionSuppressed(projection: EwarProjection | undefined, distance: number): boolean;
  propulsionSuppressedIgnoringRange(projection: EwarProjection | undefined): boolean;
}

export class EwarResolverImpl implements EwarResolver {
  private readonly stacking: StackingPenalty;

  constructor({ stackingPenalty }: { stackingPenalty: StackingPenalty }) {
    this.stacking = stackingPenalty;
  }

  speedMultiplier(projection: EwarProjection | undefined, distance: number): number {
    return this.stacking.apply(this.speedMultipliers(projection, distance, false));
  }

  speedMultiplierIgnoringRange(projection: EwarProjection | undefined): number {
    return this.stacking.apply(this.speedMultipliers(projection, 0, true));
  }

  disruptedTurret(turret: TurretSpec, projection: EwarProjection | undefined, distance: number): TurretSpec {
    return this.applyDisruptorModifiers(turret, this.disruptorModifiers(projection, distance, false));
  }

  disruptedTurretIgnoringRange(turret: TurretSpec, projection: EwarProjection | undefined): TurretSpec {
    return this.applyDisruptorModifiers(turret, this.disruptorModifiers(projection, 0, true));
  }

  propulsionSuppressed(projection: EwarProjection | undefined, distance: number): boolean {
    if (!projection) return false;
    for (let i = 0; i < projection.loadout.scramblers.length; i++) {
      const spec = projection.loadout.scramblers[i];
      const activation = projection.activation?.scramblers[i];
      if (activation && !activation.active) continue;
      const overloadBonus = activation?.overloaded ? 1 + spec.overloadRangeBonusPercent / 100 : 1;
      const range = spec.maxRange * overloadBonus;
      if (range >= distance) return true;
    }
    return false;
  }

  propulsionSuppressedIgnoringRange(projection: EwarProjection | undefined): boolean {
    if (!projection) return false;
    for (const [i, _] of projection.loadout.scramblers.entries()) {
      const activation = projection.activation?.scramblers[i];
      if (activation && !activation.active) continue;
      return true;
    }
    return false;
  }

  private speedMultipliers(projection: EwarProjection | undefined, distance: number, ignoreRange: boolean): number[] {
    if (!projection) return [];
    const multipliers: number[] = [];
    for (let i = 0; i < projection.loadout.webs.length; i++) {
      const spec = projection.loadout.webs[i];
      const activation = projection.activation?.webs[i];
      if (activation && !activation.active) continue;
      const overloadBonus = activation?.overloaded ? 1 + spec.overloadRangeBonusPercent / 100 : 1;
      if (ignoreRange) {
        multipliers.push(1 - spec.speedFactor);
      } else {
        const range = spec.maxRange * overloadBonus;
        if (range >= distance) multipliers.push(1 - spec.speedFactor);
      }
    }
    for (let i = 0; i < projection.loadout.grapplers.length; i++) {
      const spec = projection.loadout.grapplers[i];
      const activation = projection.activation?.grapplers[i];
      if (activation && !activation.active) continue;
      const overloadBonus = activation?.overloaded ? 1 + spec.overloadOptimalBonusPercent / 100 : 1;
      const optimal = spec.optimal * overloadBonus;
      const effectiveness = ignoreRange ? 1 : this.falloffEffectiveness(distance, optimal, spec.falloff);
      if (effectiveness > 0) multipliers.push(1 - spec.speedFactor * effectiveness);
    }
    return multipliers;
  }

  private disruptorModifiers(
    projection: EwarProjection | undefined,
    distance: number,
    ignoreRange: boolean,
  ): { tracking: number[]; optimal: number[]; falloff: number[] } {
    const tracking: number[] = [];
    const optimal: number[] = [];
    const falloff: number[] = [];
    if (!projection) return { tracking, optimal, falloff };

    for (let i = 0; i < projection.loadout.disruptors.length; i++) {
      const spec = projection.loadout.disruptors[i];
      const activation = projection.activation?.disruptors[i];
      if (activation && !activation.active) continue;

      const overloadBonus = activation?.overloaded ? 1 + spec.overloadStrengthBonusPercent / 100 : 1;
      const strength = spec.disruption * overloadBonus;
      const effectiveness = ignoreRange ? 1 : this.disruptorEffectiveness(distance, spec);
      const script = activation?.script ?? spec.defaultScript;
      const trackingEffect = strength * (script?.trackingMultiplier ?? 1);
      const optimalEffect = strength * (script?.optimalMultiplier ?? 1);
      const falloffEffect = strength * (script?.falloffMultiplier ?? 1);

      if (trackingEffect > 0) tracking.push(1 - trackingEffect * effectiveness);
      if (optimalEffect > 0) optimal.push(1 - optimalEffect * effectiveness);
      if (falloffEffect > 0) falloff.push(1 - falloffEffect * effectiveness);
    }

    return { tracking, optimal, falloff };
  }

  private applyDisruptorModifiers(
    turret: TurretSpec,
    modifiers: { tracking: number[]; optimal: number[]; falloff: number[] },
  ): TurretSpec {
    return {
      tracking: turret.tracking * this.stacking.apply(modifiers.tracking),
      optimal: turret.optimal * this.stacking.apply(modifiers.optimal),
      falloff: turret.falloff * this.stacking.apply(modifiers.falloff),
      sigResolution: turret.sigResolution,
    };
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
