import type { EwarResolver } from "../../../sim";
import type { DisruptionScriptSpec, EwarEffectPotentials, EwarProjection, SensorDampenerScriptSpec, SensorDampenerSpec, SensorSpec, StasisGrapplerSpec, StasisWebSpec, TargetPainterSpec, TurretSpec, TrackingDisruptorSpec } from "../../../sim";
import { ZERO_DAMAGE } from "../../../sim";
import type { I18n } from "../../i18n";
import { formatDistance, percentFromMultiplier, signedPercentFromMultiplier } from "../../format";

export interface EwarEffectDescriber {
  webDescription(projection: EwarProjection, distance: number): string;
  webHint(projection: EwarProjection): string;
  grapplerDescription(projection: EwarProjection, distance: number): string;
  grapplerHint(projection: EwarProjection): string;
  disruptorDescription(projection: EwarProjection, distance: number): string;
  disruptorHint(projection: EwarProjection): string;
  scramblerDescription(projection: EwarProjection, distance: number): string;
  scramblerHint(projection: EwarProjection): string;
  painterHint(projection: EwarProjection): string;
  dampenerHint(projection: EwarProjection): string;
  painterModuleEffect(spec: TargetPainterSpec): string;
  dampenerModuleEffect(spec: SensorDampenerSpec, script: SensorDampenerScriptSpec | undefined): string;
  webModuleEffect(spec: StasisWebSpec): string;
  grapplerModuleEffect(spec: StasisGrapplerSpec): string;
  disruptorModuleEffect(spec: TrackingDisruptorSpec, script: DisruptionScriptSpec | undefined): string;
  scramblerModuleEffect(): string;
}

export class EwarEffectDescriberImpl implements EwarEffectDescriber {
  private readonly resolver: EwarResolver;
  private readonly i18n: I18n;
  private readonly unitTurret: TurretSpec = { kind: "turret", tracking: 1, sigResolution: 1, optimal: 1, falloff: 1, damagePerShot: ZERO_DAMAGE, cycleTime: 1, turretCount: 1 };

  constructor(deps: { ewarResolver: EwarResolver; i18n: I18n }) {
    this.resolver = deps.ewarResolver;
    this.i18n = deps.i18n;
  }

  webDescription(projection: EwarProjection, distance: number): string {
    return this.speedDescription(this.resolver.speedMultiplier(projection, distance));
  }

  webHint(projection: EwarProjection): string {
    const potentials = this.resolver.potentials(projection);
    const reach = this.resolver.reach(projection);
    return `${this.speedDescription(potentials.speedMultiplier)} · ${this.formatRange(reach.web)}`;
  }

  grapplerDescription(projection: EwarProjection, distance: number): string {
    return this.speedDescription(this.resolver.speedMultiplier(projection, distance));
  }

  grapplerHint(projection: EwarProjection): string {
    const potentials = this.resolver.potentials(projection);
    const reach = this.resolver.reach(projection);
    return `${this.speedDescription(potentials.speedMultiplier)} · ${this.formatRange(reach.grappler)}`;
  }

  disruptorDescription(projection: EwarProjection, distance: number): string {
    const turret = this.resolver.disruptedTurret(this.unitTurret, projection, distance);
    return this.turretDescription(turret);
  }

  disruptorHint(projection: EwarProjection): string {
    const potentials = this.resolver.potentials(projection);
    const reach = this.resolver.reach(projection);
    return `${this.turretFromPotentials(potentials)} · ${this.formatRange(reach.disruptor)}`;
  }

  scramblerDescription(projection: EwarProjection, distance: number): string {
    return this.resolver.propulsionSuppressed(projection, distance)
      ? this.i18n.t("ewar.hover.scrambler")
      : this.i18n.t("ewar.hover.outOfRange");
  }

  scramblerHint(projection: EwarProjection): string {
    const potentials = this.resolver.potentials(projection);
    const reach = this.resolver.reach(projection);
    return `${potentials.propulsionSuppressed ? this.i18n.t("ewar.hover.scrambler") : this.i18n.t("ewar.hover.outOfRange")} · ${this.formatRange(reach.scrambler)}`;
  }

  private speedDescription(multiplier: number): string {
    if (multiplier === 1) return this.i18n.t("ewar.hover.outOfRange");
    return `${this.i18n.t("ewar.hover.web")} ${percentFromMultiplier(multiplier)}%`;
  }

  private turretDescription(turret: TurretSpec): string {
    const tracking = percentFromMultiplier(turret.tracking);
    const optimal = percentFromMultiplier(turret.optimal);
    const falloff = percentFromMultiplier(turret.falloff);
    if (tracking === 0 && optimal === 0 && falloff === 0) return this.i18n.t("ewar.hover.outOfRange");
    const trackingLabel = this.i18n.t("ewar.hover.tracking");
    const optimalLabel = this.i18n.t("ewar.hover.optimal");
    const falloffLabel = this.i18n.t("ewar.hover.falloff");
    return `${trackingLabel} -${tracking}% · ${optimalLabel} -${optimal}% · ${falloffLabel} -${falloff}%`;
  }

  private turretFromPotentials(potentials: EwarEffectPotentials): string {
    const tracking = percentFromMultiplier(potentials.trackingMultiplier);
    const optimal = percentFromMultiplier(potentials.optimalMultiplier);
    const falloff = percentFromMultiplier(potentials.falloffMultiplier);
    if (tracking === 0 && optimal === 0 && falloff === 0) return this.i18n.t("ewar.hover.outOfRange");
    const trackingLabel = this.i18n.t("ewar.hover.tracking");
    const optimalLabel = this.i18n.t("ewar.hover.optimal");
    const falloffLabel = this.i18n.t("ewar.hover.falloff");
    return `${trackingLabel} -${tracking}% · ${optimalLabel} -${optimal}% · ${falloffLabel} -${falloff}%`;
  }

  private formatRange(meters: number): string {
    const value = formatDistance(meters, (key) => this.i18n.t(key));
    return this.i18n.t("ewar.hint.range").replace("{0}", value);
  }

  webModuleEffect(spec: StasisWebSpec): string {
    return this.speedDescription(1 - spec.speedFactor);
  }

  grapplerModuleEffect(spec: StasisGrapplerSpec): string {
    return this.speedDescription(1 - spec.speedFactor);
  }

  disruptorModuleEffect(spec: TrackingDisruptorSpec, script: DisruptionScriptSpec | undefined): string {
    const strength = spec.disruption;
    const tracking = Math.round(strength * (script?.trackingMultiplier ?? 1) * 100);
    const optimal = Math.round(strength * (script?.optimalMultiplier ?? 1) * 100);
    const falloff = Math.round(strength * (script?.falloffMultiplier ?? 1) * 100);
    const trackingLabel = this.i18n.t("ewar.hover.tracking");
    const optimalLabel = this.i18n.t("ewar.hover.optimal");
    const falloffLabel = this.i18n.t("ewar.hover.falloff");
    return `${trackingLabel} -${tracking}% · ${optimalLabel} -${optimal}% · ${falloffLabel} -${falloff}%`;
  }

  scramblerModuleEffect(): string {
    return this.i18n.t("ewar.hover.scrambler");
  }

  painterHint(projection: EwarProjection): string {
    const potentials = this.resolver.potentials(projection);
    const reach = this.resolver.reach(projection);
    return `${this.sigDescription(potentials.sigMultiplier)} · ${this.formatRange(reach.painter)}`;
  }

  painterModuleEffect(spec: TargetPainterSpec): string {
    return this.sigDescription(1 + spec.signatureRadiusBonusPercent / 100);
  }

  dampenerHint(projection: EwarProjection): string {
    const potentials = this.resolver.potentials(projection);
    const reach = this.resolver.reach(projection);
    return `${this.dampenerFromPotentials(potentials)} · ${this.formatRange(reach.dampener)}`;
  }

  dampenerModuleEffect(spec: SensorDampenerSpec, script: SensorDampenerScriptSpec | undefined): string {
    const scanRes = 1 + spec.scanResolutionBonusPercent / 100 * (script?.scanResolutionMultiplier ?? 1);
    const maxRange = 1 + spec.maxTargetRangeBonusPercent / 100 * (script?.maxTargetRangeMultiplier ?? 1);
    return this.dampenerDescription({ scanResolution: scanRes, maxTargetingRange: maxRange, maxLockedTargets: 1 });
  }

  private dampenerDescription(sensor: SensorSpec): string {
    const scanRes = percentFromMultiplier(sensor.scanResolution);
    const range = percentFromMultiplier(sensor.maxTargetingRange);
    if (scanRes === 0 && range === 0) return this.i18n.t("ewar.hover.outOfRange");
    const scanResLabel = this.i18n.t("ewar.hover.scanResolution");
    const rangeLabel = this.i18n.t("ewar.hover.targetingRange");
    return `${scanResLabel} -${scanRes}% · ${rangeLabel} -${range}%`;
  }

  private sigDescription(multiplier: number): string {
    if (multiplier === 1) return this.i18n.t("ewar.hover.outOfRange");
    const percent = signedPercentFromMultiplier(multiplier);
    return `${this.i18n.t("ewar.hover.sigRadius")} ${percent > 0 ? "+" : ""}${percent}%`;
  }

  private dampenerFromPotentials(potentials: EwarEffectPotentials): string {
    const scanRes = percentFromMultiplier(potentials.scanResolutionMultiplier);
    const range = percentFromMultiplier(potentials.targetingRangeMultiplier);
    if (scanRes === 0 && range === 0) return this.i18n.t("ewar.hover.outOfRange");
    const scanResLabel = this.i18n.t("ewar.hover.scanResolution");
    const rangeLabel = this.i18n.t("ewar.hover.targetingRange");
    return `${scanResLabel} -${scanRes}% · ${rangeLabel} -${range}%`;
  }
}
