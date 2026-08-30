import type { MissileBoosterProjection, MissileBoosterSpec, MissileEnhancerSpec, MissileScriptSpec } from "../../../sim";
import type { I18n } from "../../i18n";

export interface MissileBoosterEffectDescriber {
  computerHint(projection: MissileBoosterProjection): string;
  enhancerHint(projection: MissileBoosterProjection): string;
  computerModuleEffect(spec: MissileBoosterSpec, script: MissileScriptSpec | undefined, overloaded: boolean): string;
  enhancerModuleEffect(spec: MissileEnhancerSpec): string;
}

type BonusKey = "explosionRadiusBonusPercent" | "explosionVelocityBonusPercent" | "missileVelocityBonusPercent" | "flightTimeBonusPercent";
type MultiplierKey = "explosionRadiusMultiplier" | "explosionVelocityMultiplier" | "missileVelocityMultiplier" | "flightTimeMultiplier";

const BONUS_KEYS: readonly { readonly bonus: BonusKey; readonly multiplier: MultiplierKey; readonly label: string }[] = [
  { bonus: "explosionRadiusBonusPercent", multiplier: "explosionRadiusMultiplier", label: "missileBooster.hover.explosionRadius" },
  { bonus: "explosionVelocityBonusPercent", multiplier: "explosionVelocityMultiplier", label: "missileBooster.hover.explosionVelocity" },
  { bonus: "missileVelocityBonusPercent", multiplier: "missileVelocityMultiplier", label: "missileBooster.hover.missileVelocity" },
  { bonus: "flightTimeBonusPercent", multiplier: "flightTimeMultiplier", label: "missileBooster.hover.flightTime" },
] as const;

export class MissileBoosterEffectDescriberImpl implements MissileBoosterEffectDescriber {
  private readonly i18n: I18n;

  constructor(deps: { i18n: I18n }) {
    this.i18n = deps.i18n;
  }

  computerHint(projection: MissileBoosterProjection): string {
    const values = BONUS_KEYS.map((key) => ({
      label: this.i18n.t(key.label),
      value: this.computerBonusFor(projection, key.bonus, key.multiplier),
    }));
    return this.formatParts(values);
  }

  enhancerHint(projection: MissileBoosterProjection): string {
    const values = BONUS_KEYS.map((key) => ({
      label: this.i18n.t(key.label),
      value: this.enhancerBonusFor(projection, key.bonus),
    }));
    return this.formatParts(values);
  }

  computerModuleEffect(spec: MissileBoosterSpec, script: MissileScriptSpec | undefined, overloaded: boolean): string {
    const overloadFactor = overloaded ? 1 + spec.overloadStrengthBonusPercent / 100 : 1;
    const values = BONUS_KEYS.map((key) => ({
      label: this.i18n.t(key.label),
      value: spec[key.bonus] * overloadFactor * (script?.[key.multiplier] ?? 1),
    }));
    return this.formatParts(values);
  }

  enhancerModuleEffect(spec: MissileEnhancerSpec): string {
    const values = BONUS_KEYS.map((key) => ({
      label: this.i18n.t(key.label),
      value: spec[key.bonus],
    }));
    return this.formatParts(values);
  }

  private computerBonusFor(projection: MissileBoosterProjection, bonusKey: BonusKey, multiplierKey: MultiplierKey): number {
    let total = 0;
    for (let i = 0; i < projection.loadout.computers.length; i++) {
      const spec = projection.loadout.computers[i];
      const activation = projection.activation?.computers[i];
      if (!activation || !activation.active) continue;
      const overloadFactor = activation.overloaded ? 1 + spec.overloadStrengthBonusPercent / 100 : 1;
      const multiplier = activation.script?.[multiplierKey] ?? 1;
      total += spec[bonusKey] * overloadFactor * multiplier;
    }
    return total;
  }

  private enhancerBonusFor(projection: MissileBoosterProjection, bonusKey: BonusKey): number {
    let total = 0;
    for (const enhancer of projection.loadout.enhancers) {
      total += enhancer[bonusKey];
    }
    return total;
  }

  private formatParts(values: readonly { readonly label: string; readonly value: number }[]): string {
    const parts: string[] = [];
    for (const { label, value } of values) {
      if (value !== 0) parts.push(`${label} ${value > 0 ? "+" : ""}${value.toFixed(1)}%`);
    }
    return parts.length > 0 ? parts.join(" · ") : this.i18n.t("ewar.hover.outOfRange");
  }
}
