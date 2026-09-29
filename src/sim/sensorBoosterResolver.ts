import type { StackingPenalty } from "./stackingPenalty";
import { sensorEffectPercents } from "./scriptedEffect";
import type { SensorBoostProjection, SensorSpec } from "./types";

export interface SensorBoosterResolver {
  /** Applies runtime sensor boosts and any extra same-group multipliers (command bursts) with stacking penalties. */
  boostedSensorSpec(spec: SensorSpec, projection: SensorBoostProjection | undefined, extraScanResolutionMultipliers?: readonly number[], extraRangeMultipliers?: readonly number[]): SensorSpec;
}

export class SensorBoosterResolverImpl implements SensorBoosterResolver {
  private readonly stacking: StackingPenalty;

  constructor({ stackingPenalty }: { stackingPenalty: StackingPenalty }) {
    this.stacking = stackingPenalty;
  }

  boostedSensorSpec(spec: SensorSpec, projection: SensorBoostProjection | undefined, extraScanResolutionMultipliers: readonly number[] = [], extraRangeMultipliers: readonly number[] = []): SensorSpec {
    if (!projection) {
      const scanResolution = Math.round(spec.scanResolution * this.stacking.apply(extraScanResolutionMultipliers));
      const maxTargetingRange = Math.round(spec.maxTargetingRange * this.stacking.apply(extraRangeMultipliers));
      return { scanResolution, maxTargetingRange, maxLockedTargets: spec.maxLockedTargets, strengths: spec.strengths };
    }
    const scanResMultipliers: number[] = [];
    const rangeMultipliers: number[] = [];
    let maxLockedTargets = spec.maxLockedTargets;

    for (const amplifierSpec of projection.loadout.amplifiers) {
      if (amplifierSpec.scanResolutionBonusPercent !== 0) scanResMultipliers.push(1 + amplifierSpec.scanResolutionBonusPercent / 100);
      if (amplifierSpec.maxTargetRangeBonusPercent !== 0) rangeMultipliers.push(1 + amplifierSpec.maxTargetRangeBonusPercent / 100);
      maxLockedTargets += amplifierSpec.maxLockedTargetsBonus;
    }

    for (let i = 0; i < projection.loadout.boosters.length; i++) {
      const boosterSpec = projection.loadout.boosters[i];
      const activation = projection.activation?.[i];
      if (!activation || !activation.active) continue;

      const overloadBonus = activation.overloaded ? 1 + boosterSpec.overloadStrengthBonusPercent / 100 : 1;
      const scanResPercent = boosterSpec.scanResolutionBonusPercent * overloadBonus;
      const rangePercent = boosterSpec.maxTargetRangeBonusPercent * overloadBonus;
      const script = activation.script;
      const scripted = sensorEffectPercents(scanResPercent, rangePercent, script);

      if (scripted.scanResolutionPercent !== 0) scanResMultipliers.push(1 + scripted.scanResolutionPercent / 100);
      if (scripted.maxTargetRangePercent !== 0) rangeMultipliers.push(1 + scripted.maxTargetRangePercent / 100);
    }

    const scanResolution = Math.round(spec.scanResolution * this.stacking.apply([...scanResMultipliers, ...extraScanResolutionMultipliers]));
    const maxTargetingRange = Math.round(spec.maxTargetingRange * this.stacking.apply([...rangeMultipliers, ...extraRangeMultipliers]));
    return { scanResolution, maxTargetingRange, maxLockedTargets, strengths: spec.strengths };
  }
}
