import type { EwarResolver } from "../../../sim";
import type { DisruptionScriptSpec, EwarProjection, StasisGrapplerSpec, StasisWebSpec, TargetPainterSpec, TurretSpec, TrackingDisruptorSpec } from "../../../sim";
import { ZERO_DAMAGE } from "../../../sim";
import type { I18n } from "../../i18n";

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
  painterModuleEffect(spec: TargetPainterSpec): string;
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
    const multiplier = this.resolver.speedMultiplierIgnoringRange(projection);
    const range = this.webRange(projection);
    return `${this.speedDescription(multiplier)} · ${this.formatRange(range)}`;
  }

  grapplerDescription(projection: EwarProjection, distance: number): string {
    return this.speedDescription(this.resolver.speedMultiplier(projection, distance));
  }

  grapplerHint(projection: EwarProjection): string {
    const multiplier = this.resolver.speedMultiplierIgnoringRange(projection);
    const reach = this.grapplerReach(projection);
    return `${this.speedDescription(multiplier)} · ${this.formatRange(reach)}`;
  }

  disruptorDescription(projection: EwarProjection, distance: number): string {
    return this.turretDescription(this.resolver.disruptedTurret(this.unitTurret, projection, distance));
  }

  disruptorHint(projection: EwarProjection): string {
    const turret = this.resolver.disruptedTurretIgnoringRange(this.unitTurret, projection);
    const reach = this.disruptorReach(projection);
    return `${this.turretDescription(turret)} · ${this.formatRange(reach)}`;
  }

  scramblerDescription(projection: EwarProjection, distance: number): string {
    return this.resolver.propulsionSuppressed(projection, distance)
      ? this.i18n.t("ewar.hover.scrambler")
      : this.i18n.t("ewar.hover.outOfRange");
  }

  scramblerHint(projection: EwarProjection): string {
    const suppressed = this.resolver.propulsionSuppressedIgnoringRange(projection);
    const range = this.scramblerRange(projection);
    return `${suppressed ? this.i18n.t("ewar.hover.scrambler") : this.i18n.t("ewar.hover.outOfRange")} · ${this.formatRange(range)}`;
  }

  private speedDescription(multiplier: number): string {
    if (multiplier === 1) return this.i18n.t("ewar.hover.outOfRange");
    return `${this.i18n.t("ewar.hover.web")} ${Math.round((1 - multiplier) * 100)}%`;
  }

  private turretDescription(turret: TurretSpec): string {
    const tracking = Math.round((1 - turret.tracking) * 100);
    const optimal = Math.round((1 - turret.optimal) * 100);
    const falloff = Math.round((1 - turret.falloff) * 100);
    if (tracking === 0 && optimal === 0 && falloff === 0) return this.i18n.t("ewar.hover.outOfRange");
    const trackingLabel = this.i18n.t("ewar.hover.tracking");
    const optimalLabel = this.i18n.t("ewar.hover.optimal");
    const falloffLabel = this.i18n.t("ewar.hover.falloff");
    return `${trackingLabel} -${tracking}% · ${optimalLabel} -${optimal}% · ${falloffLabel} -${falloff}%`;
  }

  private webRange(projection: EwarProjection): number {
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

  private scramblerRange(projection: EwarProjection): number {
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

  private formatRange(meters: number): string {
    const value = meters >= 10_000
      ? `${(meters / 1000).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${this.i18n.t("unit.kilometer")}`
      : `${Math.round(meters)} ${this.i18n.t("unit.meter")}`;
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
    const multiplier = this.resolver.sigMultiplierIgnoringRange(projection);
    const reach = this.painterReach(projection);
    return `${this.sigDescription(multiplier)} · ${this.formatRange(reach)}`;
  }

  painterModuleEffect(spec: TargetPainterSpec): string {
    return this.sigDescription(1 + spec.signatureRadiusBonusPercent / 100);
  }

  private sigDescription(multiplier: number): string {
    if (multiplier === 1) return this.i18n.t("ewar.hover.outOfRange");
    const percent = Math.round((multiplier - 1) * 100);
    return `${this.i18n.t("ewar.hover.sigRadius")} ${percent > 0 ? "+" : ""}${percent}%`;
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
}
