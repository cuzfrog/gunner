import type { SensorBoostProjection, SensorBoosterSpec, SensorBoosterScriptSpec, SignalAmplifierSpec } from "../../../sim";
import type { I18n } from "../../i18n";

export interface SensorBoosterEffectDescriber {
  boosterHint(projection: SensorBoostProjection): string;
  amplifierHint(projection: SensorBoostProjection): string;
  boosterModuleEffect(spec: SensorBoosterSpec, script: SensorBoosterScriptSpec | undefined, overloaded: boolean): string;
  amplifierModuleEffect(spec: SignalAmplifierSpec): string;
}

export class SensorBoosterEffectDescriberImpl implements SensorBoosterEffectDescriber {
  private readonly i18n: I18n;

  constructor(deps: { i18n: I18n }) {
    this.i18n = deps.i18n;
  }

  boosterHint(projection: SensorBoostProjection): string {
    const scanRes = this.boosterBonusFor(projection, "scanResolutionBonusPercent", "scanResolutionMultiplier");
    const range = this.boosterBonusFor(projection, "maxTargetRangeBonusPercent", "maxTargetRangeMultiplier");
    return this.formatParts(scanRes, range);
  }

  amplifierHint(projection: SensorBoostProjection): string {
    let scanRes = 0;
    let range = 0;
    let targets = 0;
    for (const amp of projection.loadout.amplifiers) {
      scanRes += amp.scanResolutionBonusPercent;
      range += amp.maxTargetRangeBonusPercent;
      targets += amp.maxLockedTargetsBonus;
    }
    const parts: string[] = [];
    if (scanRes !== 0) parts.push(`${this.i18n.t("sensorBooster.hover.scanResolution")} ${scanRes > 0 ? "+" : ""}${scanRes.toFixed(1)}%`);
    if (range !== 0) parts.push(`${this.i18n.t("sensorBooster.hover.maxTargetRange")} ${range > 0 ? "+" : ""}${range.toFixed(1)}%`);
    if (targets !== 0) parts.push(`${this.i18n.t("sensorBooster.hover.maxLockedTargets")} ${targets > 0 ? "+" : ""}${targets}`);
    return parts.length > 0 ? parts.join(" · ") : this.i18n.t("ewar.hover.outOfRange");
  }

  boosterModuleEffect(spec: SensorBoosterSpec, script: SensorBoosterScriptSpec | undefined, overloaded: boolean): string {
    const overloadFactor = overloaded ? 1 + spec.overloadStrengthBonusPercent / 100 : 1;
    const scanRes = spec.scanResolutionBonusPercent * overloadFactor * (script?.scanResolutionMultiplier ?? 1);
    const range = spec.maxTargetRangeBonusPercent * overloadFactor * (script?.maxTargetRangeMultiplier ?? 1);
    return this.formatParts(scanRes, range);
  }

  amplifierModuleEffect(spec: SignalAmplifierSpec): string {
    const parts: string[] = [];
    if (spec.scanResolutionBonusPercent !== 0) parts.push(`${this.i18n.t("sensorBooster.hover.scanResolution")} ${spec.scanResolutionBonusPercent > 0 ? "+" : ""}${spec.scanResolutionBonusPercent.toFixed(1)}%`);
    if (spec.maxTargetRangeBonusPercent !== 0) parts.push(`${this.i18n.t("sensorBooster.hover.maxTargetRange")} ${spec.maxTargetRangeBonusPercent > 0 ? "+" : ""}${spec.maxTargetRangeBonusPercent.toFixed(1)}%`);
    if (spec.maxLockedTargetsBonus !== 0) parts.push(`${this.i18n.t("sensorBooster.hover.maxLockedTargets")} ${spec.maxLockedTargetsBonus > 0 ? "+" : ""}${spec.maxLockedTargetsBonus}`);
    return parts.length > 0 ? parts.join(" · ") : this.i18n.t("ewar.hover.outOfRange");
  }

  private boosterBonusFor(projection: SensorBoostProjection, bonusKey: "scanResolutionBonusPercent" | "maxTargetRangeBonusPercent", multiplierKey: "scanResolutionMultiplier" | "maxTargetRangeMultiplier"): number {
    let total = 0;
    for (let i = 0; i < projection.loadout.boosters.length; i++) {
      const spec = projection.loadout.boosters[i];
      const activation = projection.activation?.[i];
      if (!activation || !activation.active) continue;
      const overloadFactor = activation.overloaded ? 1 + spec.overloadStrengthBonusPercent / 100 : 1;
      const multiplier = activation.script?.[multiplierKey] ?? 1;
      total += spec[bonusKey] * overloadFactor * multiplier;
    }
    return total;
  }

  private formatParts(scanRes: number, range: number): string {
    const parts: string[] = [];
    if (scanRes !== 0) parts.push(`${this.i18n.t("sensorBooster.hover.scanResolution")} ${scanRes > 0 ? "+" : ""}${scanRes.toFixed(1)}%`);
    if (range !== 0) parts.push(`${this.i18n.t("sensorBooster.hover.maxTargetRange")} ${range > 0 ? "+" : ""}${range.toFixed(1)}%`);
    return parts.length > 0 ? parts.join(" · ") : this.i18n.t("ewar.hover.outOfRange");
  }
}
