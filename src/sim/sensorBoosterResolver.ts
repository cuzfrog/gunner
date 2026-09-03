import type { StackingPenalty } from "./stackingPenalty";
import type { SensorBoostProjection, SensorSpec } from "./types";

export interface SensorBoosterResolver {
  boostedSensorSpec(spec: SensorSpec, projection: SensorBoostProjection | undefined): SensorSpec;
}

export class SensorBoosterResolverImpl implements SensorBoosterResolver {
  private readonly stacking: StackingPenalty;

  constructor({ stackingPenalty }: { stackingPenalty: StackingPenalty }) {
    this.stacking = stackingPenalty;
  }

  boostedSensorSpec(spec: SensorSpec, projection: SensorBoostProjection | undefined): SensorSpec {
    if (!projection) return spec;
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
      const script = activation.script ?? boosterSpec.defaultScript;

      if (script !== undefined) {
        const scriptedScanRes = scanResPercent * script.scanResolutionMultiplier;
        const scriptedRange = rangePercent * script.maxTargetRangeMultiplier;
        if (scriptedScanRes !== 0) scanResMultipliers.push(1 + scriptedScanRes / 100);
        if (scriptedRange !== 0) rangeMultipliers.push(1 + scriptedRange / 100);
      } else {
        if (scanResPercent !== 0) scanResMultipliers.push(1 + scanResPercent / 100);
        if (rangePercent !== 0) rangeMultipliers.push(1 + rangePercent / 100);
      }
    }

    const scanResolution = Math.round(spec.scanResolution * this.stacking.apply(scanResMultipliers));
    const maxTargetingRange = Math.round(spec.maxTargetingRange * this.stacking.apply(rangeMultipliers));
    return { scanResolution, maxTargetingRange, maxLockedTargets };
  }
}
