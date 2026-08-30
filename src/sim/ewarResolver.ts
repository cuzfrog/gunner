import type { TypeId } from "../gamedata/ids";
import type { StackingPenalty } from "./stackingPenalty";
import type {
  AppliedEwarEffect,
  DisruptionBreakdown,
  EwarEffectFamily,
  EwarProjection,
  SpeedBreakdown,
  SpeedEffectAttribution,
  StatEffectAttribution,
  TrackingDisruptorSpec,
  TurretSpec,
} from "./types";

export interface EwarResolver {
  speedMultiplier(projection: EwarProjection | undefined, distance: number): number;
  speedMultiplierIgnoringRange(projection: EwarProjection | undefined): number;
  sigMultiplier(projection: EwarProjection | undefined, distance: number): number;
  sigMultiplierIgnoringRange(projection: EwarProjection | undefined): number;
  disruptedTurret(turret: TurretSpec, projection: EwarProjection | undefined, distance: number): TurretSpec;
  disruptedTurretIgnoringRange(turret: TurretSpec, projection: EwarProjection | undefined): TurretSpec;
  propulsionSuppressed(projection: EwarProjection | undefined, distance: number): boolean;
  propulsionSuppressedIgnoringRange(projection: EwarProjection | undefined): boolean;
  appliedEffects(projection: EwarProjection | undefined, distance: number): readonly AppliedEwarEffect[];
  speedBreakdown(projection: EwarProjection | undefined, distance: number): SpeedBreakdown;
  disruptionBreakdown(projection: EwarProjection | undefined, distance: number): DisruptionBreakdown;
}

const MIN_APPLIED_EFFECTIVENESS = 0.01;

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

  sigMultiplier(projection: EwarProjection | undefined, distance: number): number {
    return this.stacking.apply(this.sigMultipliers(projection, distance, false));
  }

  sigMultiplierIgnoringRange(projection: EwarProjection | undefined): number {
    return this.stacking.apply(this.sigMultipliers(projection, 0, true));
  }

  disruptedTurret(turret: TurretSpec, projection: EwarProjection | undefined, distance: number): TurretSpec {
    return this.applyDisruptorModifiers(turret, this.disruptorModifiers(projection, distance, false));
  }

  disruptedTurretIgnoringRange(turret: TurretSpec, projection: EwarProjection | undefined): TurretSpec {
    return this.applyDisruptorModifiers(turret, this.disruptorModifiers(projection, 0, true));
  }

  propulsionSuppressed(projection: EwarProjection | undefined, distance: number): boolean {
    return this.scramblerAttribution(projection, distance) !== undefined;
  }

  private scramblerAttribution(projection: EwarProjection | undefined, distance: number): { readonly moduleId: TypeId } | undefined {
    if (!projection) return undefined;
    for (let i = 0; i < projection.loadout.scramblers.length; i++) {
      const spec = projection.loadout.scramblers[i];
      const activation = projection.activation?.scramblers[i];
      if (activation && !activation.active) continue;
      const overloadBonus = activation?.overloaded ? 1 + spec.overloadRangeBonusPercent / 100 : 1;
      const range = spec.maxRange * overloadBonus;
      if (range >= distance) return { moduleId: spec.moduleId };
    }
    return undefined;
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

  appliedEffects(projection: EwarProjection | undefined, distance: number): readonly AppliedEwarEffect[] {
    if (!projection) return [];
    const effects: AppliedEwarEffect[] = [];
    const representatives: Partial<Record<EwarEffectFamily, TypeId>> = {};
    for (let i = 0; i < projection.loadout.webs.length; i++) {
      const spec = projection.loadout.webs[i];
      const activation = projection.activation?.webs[i];
      if (activation && !activation.active) continue;
      if (representatives.web !== undefined) continue;
      const overloadBonus = activation?.overloaded ? 1 + spec.overloadRangeBonusPercent / 100 : 1;
      const range = spec.maxRange * overloadBonus;
      if (range >= distance) representatives.web = spec.moduleId;
    }
    for (let i = 0; i < projection.loadout.grapplers.length; i++) {
      const spec = projection.loadout.grapplers[i];
      const activation = projection.activation?.grapplers[i];
      if (activation && !activation.active) continue;
      if (representatives.grappler !== undefined) continue;
      const overloadBonus = activation?.overloaded ? 1 + spec.overloadOptimalBonusPercent / 100 : 1;
      const optimal = spec.optimal * overloadBonus;
      if (this.falloffEffectiveness(distance, optimal, spec.falloff) >= MIN_APPLIED_EFFECTIVENESS) representatives.grappler = spec.moduleId;
    }
    for (let i = 0; i < projection.loadout.scramblers.length; i++) {
      const spec = projection.loadout.scramblers[i];
      const activation = projection.activation?.scramblers[i];
      if (activation && !activation.active) continue;
      if (representatives.scrambler !== undefined) continue;
      const overloadBonus = activation?.overloaded ? 1 + spec.overloadRangeBonusPercent / 100 : 1;
      const range = spec.maxRange * overloadBonus;
      if (range >= distance) representatives.scrambler = spec.moduleId;
    }
    for (let i = 0; i < projection.loadout.disruptors.length; i++) {
      const spec = projection.loadout.disruptors[i];
      const activation = projection.activation?.disruptors[i];
      if (activation && !activation.active) continue;
      if (representatives.disruptor !== undefined) continue;
      if (this.falloffEffectiveness(distance, spec.optimal, spec.falloff) >= MIN_APPLIED_EFFECTIVENESS) representatives.disruptor = spec.moduleId;
    }
    if (representatives.web !== undefined) effects.push({ family: "web", moduleId: representatives.web });
    if (representatives.grappler !== undefined) effects.push({ family: "grappler", moduleId: representatives.grappler });
    if (representatives.scrambler !== undefined) effects.push({ family: "scrambler", moduleId: representatives.scrambler });
    if (representatives.disruptor !== undefined) effects.push({ family: "disruptor", moduleId: representatives.disruptor });
    return effects;
  }

  speedBreakdown(projection: EwarProjection | undefined, distance: number): SpeedBreakdown {
    const webCandidates: SpeedEffectAttribution[] = [];
    const grapplerCandidates: SpeedEffectAttribution[] = [];
    if (projection) {
      for (let i = 0; i < projection.loadout.webs.length; i++) {
        const spec = projection.loadout.webs[i];
        const activation = projection.activation?.webs[i];
        if (activation && !activation.active) continue;
        const overloadBonus = activation?.overloaded ? 1 + spec.overloadRangeBonusPercent / 100 : 1;
        const range = spec.maxRange * overloadBonus;
        if (range >= distance) webCandidates.push({ family: "web", moduleId: spec.moduleId, multiplier: 1 - spec.speedFactor });
      }
      for (let i = 0; i < projection.loadout.grapplers.length; i++) {
        const spec = projection.loadout.grapplers[i];
        const activation = projection.activation?.grapplers[i];
        if (activation && !activation.active) continue;
        const overloadBonus = activation?.overloaded ? 1 + spec.overloadOptimalBonusPercent / 100 : 1;
        const optimal = spec.optimal * overloadBonus;
        const effectiveness = this.falloffEffectiveness(distance, optimal, spec.falloff);
        if (effectiveness > 0) {
          grapplerCandidates.push({ family: "grappler", moduleId: spec.moduleId, multiplier: 1 - spec.speedFactor * effectiveness });
        }
      }
    }
    const effects: SpeedEffectAttribution[] = [];
    const web = this.representativeSpeedEffect(webCandidates);
    if (web !== undefined) effects.push(web);
    const grappler = this.representativeSpeedEffect(grapplerCandidates);
    if (grappler !== undefined) effects.push(grappler);
    const scrambler = this.scramblerAttribution(projection, distance);
    const propulsionSuppressed = scrambler !== undefined;
    if (scrambler !== undefined) effects.push({ family: "scrambler", moduleId: scrambler.moduleId, multiplier: 1 });
    return { effects, propulsionSuppressed };
  }

  disruptionBreakdown(projection: EwarProjection | undefined, distance: number): DisruptionBreakdown {
    return this.disruptorModifiers(projection, distance, false);
  }

  private representativeSpeedEffect(candidates: readonly SpeedEffectAttribution[]): SpeedEffectAttribution | undefined {
    if (candidates.length === 0) return undefined;
    let best = candidates[0];
    for (let i = 1; i < candidates.length; i++) {
      if (candidates[i].multiplier < best.multiplier) best = candidates[i];
    }
    return best;
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

  private sigMultipliers(projection: EwarProjection | undefined, distance: number, ignoreRange: boolean): number[] {
    if (!projection) return [];
    const multipliers: number[] = [];
    for (let i = 0; i < projection.loadout.painters.length; i++) {
      const spec = projection.loadout.painters[i];
      const activation = projection.activation?.painters[i];
      if (activation && !activation.active) continue;
      const overloadBonus = activation?.overloaded ? 1 + spec.overloadStrengthBonusPercent / 100 : 1;
      const strength = spec.signatureRadiusBonusPercent * overloadBonus;
      const effectiveness = ignoreRange ? 1 : this.falloffEffectiveness(distance, spec.maxRange, spec.falloff);
      if (effectiveness > 0) multipliers.push(1 + (strength / 100) * effectiveness);
    }
    return multipliers;
  }

  private disruptorModifiers(
    projection: EwarProjection | undefined,
    distance: number,
    ignoreRange: boolean,
  ): DisruptionBreakdown {
    const tracking: StatEffectAttribution[] = [];
    const optimal: StatEffectAttribution[] = [];
    const falloff: StatEffectAttribution[] = [];
    if (!projection) return { tracking, optimal, falloff };

    for (let i = 0; i < projection.loadout.disruptors.length; i++) {
      const spec = projection.loadout.disruptors[i];
      const activation = projection.activation?.disruptors[i];
      if (activation && !activation.active) continue;

      const overloadBonus = activation?.overloaded ? 1 + spec.overloadStrengthBonusPercent / 100 : 1;
      const strength = spec.disruption * overloadBonus;
      const effectiveness = ignoreRange ? 1 : this.disruptorEffectiveness(distance, spec);
      if (effectiveness <= 0) continue;
      const script = activation?.script ?? spec.defaultScript;
      const scriptId = script?.moduleId;
      const trackingEffect = strength * (script?.trackingMultiplier ?? 1);
      const optimalEffect = strength * (script?.optimalMultiplier ?? 1);
      const falloffEffect = strength * (script?.falloffMultiplier ?? 1);

      if (trackingEffect > 0) tracking.push({ moduleId: spec.moduleId, scriptId, multiplier: 1 - trackingEffect * effectiveness });
      if (optimalEffect > 0) optimal.push({ moduleId: spec.moduleId, scriptId, multiplier: 1 - optimalEffect * effectiveness });
      if (falloffEffect > 0) falloff.push({ moduleId: spec.moduleId, scriptId, multiplier: 1 - falloffEffect * effectiveness });
    }

    return { tracking, optimal, falloff };
  }

  private applyDisruptorModifiers(turret: TurretSpec, modifiers: DisruptionBreakdown): TurretSpec {
    return {
      ...turret,
      tracking: turret.tracking * this.stacking.apply(modifiers.tracking.map((entry) => entry.multiplier)),
      optimal: turret.optimal * this.stacking.apply(modifiers.optimal.map((entry) => entry.multiplier)),
      falloff: turret.falloff * this.stacking.apply(modifiers.falloff.map((entry) => entry.multiplier)),
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
