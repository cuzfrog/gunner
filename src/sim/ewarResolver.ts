import type { TypeId } from "../gamedata/ids";
import type { StackingPenalty } from "./stackingPenalty";
import { type AppliedEwarEffect, type DampenerBreakdown, type DisruptionBreakdown, type EwarEffectPotentials, type EwarProjection, type EwarReach, type SensorDampenerSpec, type SensorSpec, type SpeedBreakdown, type SpeedEffectAttribution, type StatEffectAttribution, type TrackingDisruptorSpec, type TurretSpec } from "./types";

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
  disruptionMultipliers(projection: EwarProjection | undefined, distance: number): { readonly tracking: number; readonly optimal: number; readonly falloff: number };
  dampenerBreakdown(projection: EwarProjection | undefined, distance: number): DampenerBreakdown;
  dampenedSensorSpec(spec: SensorSpec, projection: EwarProjection | undefined, distance: number): SensorSpec;
  dampenedSensorSpecIgnoringRange(spec: SensorSpec, projection: EwarProjection | undefined): SensorSpec;
  reach(projection: EwarProjection | undefined): EwarReach;
  potentials(projection: EwarProjection | undefined): EwarEffectPotentials;
}

const MIN_APPLIED_EFFECTIVENESS = 0.01;

export class EwarResolverImpl implements EwarResolver {
  private readonly stacking: StackingPenalty;
  private readonly unitSensor: SensorSpec = { scanResolution: 1, maxTargetingRange: 1, maxLockedTargets: 1 };

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
    const webEffect = this.webAppliedEffect(projection, distance);
    if (webEffect) effects.push(webEffect);
    const grapplerEffect = this.grapplerAppliedEffect(projection, distance);
    if (grapplerEffect) effects.push(grapplerEffect);
    const scramblerEffect = this.scramblerAppliedEffect(projection, distance);
    if (scramblerEffect) effects.push(scramblerEffect);
    const disruptorEffect = this.disruptorAppliedEffect(projection, distance);
    if (disruptorEffect) effects.push(disruptorEffect);
    const dampenerEffect = this.dampenerAppliedEffect(projection, distance);
    if (dampenerEffect) effects.push(dampenerEffect);
    const painterEffect = this.painterAppliedEffect(projection, distance);
    if (painterEffect) effects.push(painterEffect);
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

  disruptionMultipliers(projection: EwarProjection | undefined, distance: number): { readonly tracking: number; readonly optimal: number; readonly falloff: number } {
    const modifiers = this.disruptorModifiers(projection, distance, false);
    return {
      tracking: this.stacking.apply(modifiers.tracking.map((e) => e.multiplier)),
      optimal: this.stacking.apply(modifiers.optimal.map((e) => e.multiplier)),
      falloff: this.stacking.apply(modifiers.falloff.map((e) => e.multiplier)),
    };
  }

  dampenerBreakdown(projection: EwarProjection | undefined, distance: number): DampenerBreakdown {
    return this.dampenerAttributions(projection, distance, false);
  }

  dampenedSensorSpec(spec: SensorSpec, projection: EwarProjection | undefined, distance: number): SensorSpec {
    const modifiers = this.dampenerModifiers(projection, distance, false);
    return this.applyDampenerModifiers(spec, modifiers);
  }

  dampenedSensorSpecIgnoringRange(spec: SensorSpec, projection: EwarProjection | undefined): SensorSpec {
    const modifiers = this.dampenerModifiers(projection, 0, true);
    return this.applyDampenerModifiers(spec, modifiers);
  }

  reach(projection: EwarProjection | undefined): EwarReach {
    if (!projection) return { web: 0, grappler: 0, scrambler: 0, disruptor: 0, painter: 0, dampener: 0 };
    return {
      web: this.webReach(projection),
      grappler: this.grapplerReach(projection),
      scrambler: this.scramblerReach(projection),
      disruptor: this.disruptorReach(projection),
      painter: this.painterReach(projection),
      dampener: this.dampenerReach(projection),
    };
  }

  potentials(projection: EwarProjection | undefined): EwarEffectPotentials {
    const speedMultiplier = this.speedMultiplierIgnoringRange(projection);
    const sigMultiplier = this.sigMultiplierIgnoringRange(projection);
    const propulsionSuppressed = this.propulsionSuppressedIgnoringRange(projection);
    const disruption = this.disruptorModifiers(projection, 0, true);
    const sensor = this.dampenedSensorSpecIgnoringRange(this.unitSensor, projection);
    return {
      speedMultiplier,
      sigMultiplier,
      propulsionSuppressed,
      trackingMultiplier: this.stacking.apply(disruption.tracking.map((e) => e.multiplier)),
      optimalMultiplier: this.stacking.apply(disruption.optimal.map((e) => e.multiplier)),
      falloffMultiplier: this.stacking.apply(disruption.falloff.map((e) => e.multiplier)),
      scanResolutionMultiplier: sensor.scanResolution,
      targetingRangeMultiplier: sensor.maxTargetingRange,
    };
  }

  private representativeSpeedEffect(candidates: readonly SpeedEffectAttribution[]): SpeedEffectAttribution | undefined {
    if (candidates.length === 0) return undefined;
    let best = candidates[0];
    for (let i = 1; i < candidates.length; i++) {
      if (candidates[i].multiplier < best.multiplier) best = candidates[i];
    }
    return best;
  }

  private webAppliedEffect(projection: EwarProjection, distance: number): AppliedEwarEffect | undefined {
    for (let i = 0; i < projection.loadout.webs.length; i++) {
      const spec = projection.loadout.webs[i];
      const activation = projection.activation?.webs[i];
      if (activation && !activation.active) continue;
      const overloadBonus = activation?.overloaded ? 1 + spec.overloadRangeBonusPercent / 100 : 1;
      const range = spec.maxRange * overloadBonus;
      if (range >= distance) return { family: "web", moduleId: spec.moduleId, speedMultiplier: 1 - spec.speedFactor };
    }
    return undefined;
  }

  private grapplerAppliedEffect(projection: EwarProjection, distance: number): AppliedEwarEffect | undefined {
    for (let i = 0; i < projection.loadout.grapplers.length; i++) {
      const spec = projection.loadout.grapplers[i];
      const activation = projection.activation?.grapplers[i];
      if (activation && !activation.active) continue;
      const overloadBonus = activation?.overloaded ? 1 + spec.overloadOptimalBonusPercent / 100 : 1;
      const optimal = spec.optimal * overloadBonus;
      const effectiveness = this.falloffEffectiveness(distance, optimal, spec.falloff);
      if (effectiveness >= MIN_APPLIED_EFFECTIVENESS) return { family: "grappler", moduleId: spec.moduleId, speedMultiplier: 1 - spec.speedFactor * effectiveness };
    }
    return undefined;
  }

  private scramblerAppliedEffect(projection: EwarProjection, distance: number): AppliedEwarEffect | undefined {
    for (let i = 0; i < projection.loadout.scramblers.length; i++) {
      const spec = projection.loadout.scramblers[i];
      const activation = projection.activation?.scramblers[i];
      if (activation && !activation.active) continue;
      const overloadBonus = activation?.overloaded ? 1 + spec.overloadRangeBonusPercent / 100 : 1;
      const range = spec.maxRange * overloadBonus;
      if (range >= distance) return { family: "scrambler", moduleId: spec.moduleId };
    }
    return undefined;
  }

  private disruptorAppliedEffect(projection: EwarProjection, distance: number): AppliedEwarEffect | undefined {
    for (let i = 0; i < projection.loadout.disruptors.length; i++) {
      const spec = projection.loadout.disruptors[i];
      const activation = projection.activation?.disruptors[i];
      if (activation && !activation.active) continue;
      const effectiveness = this.falloffEffectiveness(distance, spec.optimal, spec.falloff);
      if (effectiveness < MIN_APPLIED_EFFECTIVENESS) continue;
      const overloadBonus = activation?.overloaded ? 1 + spec.overloadStrengthBonusPercent / 100 : 1;
      const strength = spec.disruption * overloadBonus;
      const script = activation?.script ?? spec.defaultScript;
      const trackingMultiplier = 1 - strength * (script?.trackingMultiplier ?? 1) * effectiveness;
      const optimalMultiplier = 1 - strength * (script?.optimalMultiplier ?? 1) * effectiveness;
      const falloffMultiplier = 1 - strength * (script?.falloffMultiplier ?? 1) * effectiveness;
      return { family: "disruptor", moduleId: spec.moduleId, trackingMultiplier, optimalMultiplier, falloffMultiplier };
    }
    return undefined;
  }

  private dampenerAppliedEffect(projection: EwarProjection, distance: number): AppliedEwarEffect | undefined {
    for (let i = 0; i < projection.loadout.dampeners.length; i++) {
      const spec = projection.loadout.dampeners[i];
      const activation = projection.activation?.dampeners[i];
      if (activation && !activation.active) continue;
      const effectiveness = this.falloffEffectiveness(distance, spec.optimal, spec.falloff);
      if (effectiveness < MIN_APPLIED_EFFECTIVENESS) continue;
      const overloadBonus = activation?.overloaded ? 1 + spec.overloadStrengthBonusPercent / 100 : 1;
      const scanResPercent = spec.scanResolutionBonusPercent * overloadBonus;
      const rangePercent = spec.maxTargetRangeBonusPercent * overloadBonus;
      const script = activation?.script ?? spec.defaultScript;
      const scanResolutionMultiplier = 1 + (scanResPercent * (script?.scanResolutionMultiplier ?? 1) / 100) * effectiveness;
      const maxTargetRangeMultiplier = 1 + (rangePercent * (script?.maxTargetRangeMultiplier ?? 1) / 100) * effectiveness;
      return { family: "dampener", moduleId: spec.moduleId, scanResolutionMultiplier, maxTargetRangeMultiplier };
    }
    return undefined;
  }

  private painterAppliedEffect(projection: EwarProjection, distance: number): AppliedEwarEffect | undefined {
    for (let i = 0; i < projection.loadout.painters.length; i++) {
      const spec = projection.loadout.painters[i];
      const activation = projection.activation?.painters[i];
      if (activation && !activation.active) continue;
      const effectiveness = this.falloffEffectiveness(distance, spec.maxRange, spec.falloff);
      if (effectiveness < MIN_APPLIED_EFFECTIVENESS) continue;
      const overloadBonus = activation?.overloaded ? 1 + spec.overloadStrengthBonusPercent / 100 : 1;
      const strength = spec.signatureRadiusBonusPercent * overloadBonus;
      const signatureMultiplier = 1 + (strength / 100) * effectiveness;
      return { family: "painter", moduleId: spec.moduleId, signatureMultiplier };
    }
    return undefined;
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

  private dampenerAttributions(
    projection: EwarProjection | undefined,
    distance: number,
    ignoreRange: boolean,
  ): DampenerBreakdown {
    if (!projection) return { scanResolution: [], maxTargetRange: [] };
    const scanResolution: StatEffectAttribution[] = [];
    const maxTargetRange: StatEffectAttribution[] = [];
    for (let i = 0; i < projection.loadout.dampeners.length; i++) {
      const spec = projection.loadout.dampeners[i];
      const activation = projection.activation?.dampeners[i];
      if (activation && !activation.active) continue;
      const overloadBonus = activation?.overloaded ? 1 + spec.overloadStrengthBonusPercent / 100 : 1;
      const scanResPercent = spec.scanResolutionBonusPercent * overloadBonus;
      const rangePercent = spec.maxTargetRangeBonusPercent * overloadBonus;
      const effectiveness = ignoreRange ? 1 : this.falloffEffectiveness(distance, spec.optimal, spec.falloff);
      if (effectiveness <= 0) continue;
      const script = activation?.script ?? spec.defaultScript;
      const scriptedScanRes = scanResPercent * (script?.scanResolutionMultiplier ?? 1);
      const scriptedRange = rangePercent * (script?.maxTargetRangeMultiplier ?? 1);
      if (scriptedScanRes !== 0) scanResolution.push({ moduleId: spec.moduleId, scriptId: script?.moduleId, multiplier: 1 + (scriptedScanRes / 100) * effectiveness });
      if (scriptedRange !== 0) maxTargetRange.push({ moduleId: spec.moduleId, scriptId: script?.moduleId, multiplier: 1 + (scriptedRange / 100) * effectiveness });
    }
    return { scanResolution, maxTargetRange };
  }

  private dampenerModifiers(
    projection: EwarProjection | undefined,
    distance: number,
    ignoreRange: boolean,
  ): { scanResMultipliers: readonly number[]; rangeMultipliers: readonly number[] } {
    if (!projection) return { scanResMultipliers: [], rangeMultipliers: [] };
    const scanResMultipliers: number[] = [];
    const rangeMultipliers: number[] = [];

    for (let i = 0; i < projection.loadout.dampeners.length; i++) {
      const spec = projection.loadout.dampeners[i];
      const activation = projection.activation?.dampeners[i];
      if (activation && !activation.active) continue;

      const overloadBonus = activation?.overloaded ? 1 + spec.overloadStrengthBonusPercent / 100 : 1;
      const scanResPercent = spec.scanResolutionBonusPercent * overloadBonus;
      const rangePercent = spec.maxTargetRangeBonusPercent * overloadBonus;
      const effectiveness = ignoreRange ? 1 : this.falloffEffectiveness(distance, spec.optimal, spec.falloff);
      if (effectiveness <= 0) continue;

      const script = activation?.script ?? spec.defaultScript;
      const scriptedScanRes = scanResPercent * (script?.scanResolutionMultiplier ?? 1);
      const scriptedRange = rangePercent * (script?.maxTargetRangeMultiplier ?? 1);

      if (scriptedScanRes !== 0) scanResMultipliers.push(1 + (scriptedScanRes / 100) * effectiveness);
      if (scriptedRange !== 0) rangeMultipliers.push(1 + (scriptedRange / 100) * effectiveness);
    }

    return { scanResMultipliers, rangeMultipliers };
  }

  private applyDampenerModifiers(spec: SensorSpec, modifiers: { scanResMultipliers: readonly number[]; rangeMultipliers: readonly number[] }): SensorSpec {
    const scanResolution = Math.round(spec.scanResolution * this.stacking.apply(modifiers.scanResMultipliers));
    const maxTargetingRange = Math.round(spec.maxTargetingRange * this.stacking.apply(modifiers.rangeMultipliers));
    return { scanResolution, maxTargetingRange, maxLockedTargets: spec.maxLockedTargets };
  }

  private webReach(projection: EwarProjection): number {
    let maxRange = 0;
    for (let i = 0; i < projection.loadout.webs.length; i++) {
      const activation = projection.activation?.webs[i];
      if (activation && !activation.active) continue;
      const spec = projection.loadout.webs[i];
      const scale = activation?.overloaded ? 1 + spec.overloadRangeBonusPercent / 100 : 1;
      maxRange = Math.max(maxRange, spec.maxRange * scale);
    }
    return maxRange;
  }

  private grapplerReach(projection: EwarProjection): number {
    let reach = 0;
    for (let i = 0; i < projection.loadout.grapplers.length; i++) {
      const activation = projection.activation?.grapplers[i];
      if (activation && !activation.active) continue;
      const spec = projection.loadout.grapplers[i];
      const scale = activation?.overloaded ? 1 + spec.overloadOptimalBonusPercent / 100 : 1;
      reach = Math.max(reach, spec.optimal * scale + spec.falloff);
    }
    return reach;
  }

  private scramblerReach(projection: EwarProjection): number {
    let maxRange = 0;
    for (let i = 0; i < projection.loadout.scramblers.length; i++) {
      const activation = projection.activation?.scramblers[i];
      if (activation && !activation.active) continue;
      const spec = projection.loadout.scramblers[i];
      const scale = activation?.overloaded ? 1 + spec.overloadRangeBonusPercent / 100 : 1;
      maxRange = Math.max(maxRange, spec.maxRange * scale);
    }
    return maxRange;
  }

  private disruptorReach(projection: EwarProjection): number {
    let reach = 0;
    for (let i = 0; i < projection.loadout.disruptors.length; i++) {
      const activation = projection.activation?.disruptors[i];
      if (activation && !activation.active) continue;
      const spec = projection.loadout.disruptors[i];
      reach = Math.max(reach, spec.optimal + spec.falloff);
    }
    return reach;
  }

  private painterReach(projection: EwarProjection): number {
    let reach = 0;
    for (let i = 0; i < projection.loadout.painters.length; i++) {
      const activation = projection.activation?.painters[i];
      if (activation && !activation.active) continue;
      const spec = projection.loadout.painters[i];
      reach = Math.max(reach, spec.maxRange + spec.falloff);
    }
    return reach;
  }

  private dampenerReach(projection: EwarProjection): number {
    let reach = 0;
    for (let i = 0; i < projection.loadout.dampeners.length; i++) {
      const activation = projection.activation?.dampeners[i];
      if (activation && !activation.active) continue;
      const spec = projection.loadout.dampeners[i];
      reach = Math.max(reach, spec.optimal + spec.falloff);
    }
    return reach;
  }
}
