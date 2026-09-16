import type { EwarResolver } from "../../../sim";
import type { AppliedEwarEffect, DisruptionScriptSpec, EwarEffectPotentials, EwarProjection, EnergyNeutralizerSpec, NosferatuSpec, SensorDampenerScriptSpec, SensorDampenerSpec, SensorSpec, StasisGrapplerSpec, StasisWebSpec, TargetPainterSpec, TrackingDisruptorSpec } from "../../../sim";
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
  neutralizerDescription(projection: EwarProjection, distance: number): string;
  nosferatuDescription(projection: EwarProjection, distance: number): string;
  painterHint(projection: EwarProjection): string;
  dampenerHint(projection: EwarProjection): string;
  neutralizerHint(projection: EwarProjection): string;
  nosferatuHint(projection: EwarProjection): string;
}

export class EwarEffectDescriberImpl implements EwarEffectDescriber {
  private readonly resolver: EwarResolver;
  private readonly i18n: I18n;

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
    const multipliers = this.resolver.disruptionMultipliers(projection, distance);
    return this.turretFromValues(multipliers.tracking, multipliers.optimal, multipliers.falloff);
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

  neutralizerDescription(projection: EwarProjection, distance: number): string {
    return this.capWarfareDescription(projection, distance, "neutralizer");
  }

  nosferatuDescription(projection: EwarProjection, distance: number): string {
    return this.capWarfareDescription(projection, distance, "nosferatu");
  }

  private speedDescription(multiplier: number): string {
    if (multiplier === 1) return this.i18n.t("ewar.hover.outOfRange");
    return `${this.i18n.t("ewar.hover.web")} ${percentFromMultiplier(multiplier)}%`;
  }

  private capWarfareDescription(projection: EwarProjection, distance: number, family: "neutralizer" | "nosferatu"): string {
    const applied = this.resolver.appliedEffects(projection, distance).filter((e): e is Extract<AppliedEwarEffect, { family: typeof family }> => e.family === family);
    if (applied.length === 0) return this.i18n.t("ewar.hover.outOfRange");
    const perSecond = applied.reduce((sum, e) => sum + e.amountPerCycle / e.cycleTime, 0);
    return `${Math.round(perSecond * 10) / 10} GJ/s`;
  }

  private turretFromValues(tracking: number, optimal: number, falloff: number): string {
    const trackingPct = percentFromMultiplier(tracking);
    const optimalPct = percentFromMultiplier(optimal);
    const falloffPct = percentFromMultiplier(falloff);
    if (trackingPct === 0 && optimalPct === 0 && falloffPct === 0) return this.i18n.t("ewar.hover.outOfRange");
    const trackingLabel = this.i18n.t("ewar.hover.tracking");
    const optimalLabel = this.i18n.t("ewar.hover.optimal");
    const falloffLabel = this.i18n.t("ewar.hover.falloff");
    return `${trackingLabel} -${trackingPct}% · ${optimalLabel} -${optimalPct}% · ${falloffLabel} -${falloffPct}%`;
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

  neutralizerHint(projection: EwarProjection): string {
    return this.capWarfareHint(projection.loadout.neutralizers, projection.activation?.neutralizers, (specs) => this.totalDrainPerSecond(specs), this.resolver.reach(projection).neutralizer);
  }

  nosferatuHint(projection: EwarProjection): string {
    return this.capWarfareHint(projection.loadout.nosferatu, projection.activation?.nosferatu, (specs) => this.totalDrainPerSecond(specs), this.resolver.reach(projection).nosferatu);
  }

  private totalDrainPerSecond(specs: readonly { readonly amount: number; readonly cycleTime: number }[]): string {
    const perSecond = specs.reduce((sum, spec) => sum + spec.amount / spec.cycleTime, 0);
    return `${roundTo1(perSecond)} GJ/s`;
  }

  private capWarfareHint(
    specs: readonly { readonly amount: number; readonly cycleTime: number }[],
    activations: readonly { readonly active: boolean }[] | undefined,
    drain: (specs: readonly { readonly amount: number; readonly cycleTime: number }[]) => string,
    reach: number,
  ): string {
    const active = specs.filter((_, i) => activations?.[i]?.active ?? true);
    const drainLabel = active.length > 0 ? drain(active) : this.i18n.t("ewar.hover.outOfRange");
    return `${drainLabel} · ${this.formatRange(reach)}`;
  }

  painterHint(projection: EwarProjection): string {
    const potentials = this.resolver.potentials(projection);
    const reach = this.resolver.reach(projection);
    return `${this.sigDescription(potentials.sigMultiplier)} · ${this.formatRange(reach.painter)}`;
  }

  dampenerHint(projection: EwarProjection): string {
    const potentials = this.resolver.potentials(projection);
    const reach = this.resolver.reach(projection);
    return `${this.dampenerFromPotentials(potentials)} · ${this.formatRange(reach.dampener)}`;
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

function roundTo1(value: number): number {
  return Math.round(value * 10) / 10;
}
