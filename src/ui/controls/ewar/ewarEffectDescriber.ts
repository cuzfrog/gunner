import type { EwarResolver } from "../../../sim";
import type { EwarProjection, TurretSpec } from "../../../sim";
import type { I18n } from "../../i18n";

export interface EwarEffectDescriber {
  webDescription(projection: EwarProjection, distance: number): string;
  disruptorDescription(projection: EwarProjection, distance: number): string;
  scramblerDescription(projection: EwarProjection, distance: number): string;
}

export class EwarEffectDescriberImpl implements EwarEffectDescriber {
  private readonly resolver: EwarResolver;
  private readonly i18n: I18n;
  private readonly unitTurret: TurretSpec = { tracking: 1, sigResolution: 1, optimal: 1, falloff: 1 };

  constructor(deps: { ewarResolver: EwarResolver; i18n: I18n }) {
    this.resolver = deps.ewarResolver;
    this.i18n = deps.i18n;
  }

  webDescription(projection: EwarProjection, distance: number): string {
    const multiplier = this.resolver.webSpeedMultiplier(projection, distance);
    if (multiplier === 1) return this.i18n.t("ewar.hover.outOfRange");
    return `${this.i18n.t("ewar.hover.web")} ${Math.round((1 - multiplier) * 100)}%`;
  }

  disruptorDescription(projection: EwarProjection, distance: number): string {
    const turret = this.resolver.disruptedTurret(this.unitTurret, projection, distance);
    const tracking = Math.round((1 - turret.tracking) * 100);
    const optimal = Math.round((1 - turret.optimal) * 100);
    const falloff = Math.round((1 - turret.falloff) * 100);
    if (tracking === 0 && optimal === 0 && falloff === 0) return this.i18n.t("ewar.hover.outOfRange");
    const trackingLabel = this.i18n.t("ewar.hover.tracking");
    const optimalLabel = this.i18n.t("ewar.hover.optimal");
    const falloffLabel = this.i18n.t("ewar.hover.falloff");
    return `${trackingLabel} -${tracking}% \u00b7 ${optimalLabel} -${optimal}% \u00b7 ${falloffLabel} -${falloff}%`;
  }

  scramblerDescription(projection: EwarProjection, distance: number): string {
    return this.resolver.propulsionSuppressed(projection, distance)
      ? this.i18n.t("ewar.hover.scrambler")
      : this.i18n.t("ewar.hover.outOfRange");
  }
}
