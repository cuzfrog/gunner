import type { DamageType } from "../../../fitting";
import type { FittingDb } from "../../../gamedata/fittingDb";
import type { I18n } from "../../i18n";
import type { HintContentProvider } from "../hoverHint";
import type { AmmoHintModel, AmmoHintRenderer, AmmoHintTypeRow } from "./ammoHintRenderer";

const DAMAGE_ICON_URLS: Readonly<Record<DamageType, string>> = {
  em: "images/icons/damage-em.png",
  thermal: "images/icons/damage-thermal.png",
  kinetic: "images/icons/damage-kinetic.png",
  explosive: "images/icons/damage-explosive.png",
};

const DAMAGE_TYPE_ORDER: readonly DamageType[] = ["em", "thermal", "kinetic", "explosive"];

export type AmmoHintProvider = HintContentProvider;

export interface AmmoHintProviderDeps {
  readonly fittingDb: FittingDb;
  readonly i18n: I18n;
  readonly ammoHintRenderer: AmmoHintRenderer;
}

export class AmmoHintProviderImpl implements AmmoHintProvider {
  private readonly fittingDb: FittingDb;
  private readonly i18n: I18n;
  private readonly renderer: AmmoHintRenderer;

  constructor(deps: AmmoHintProviderDeps) {
    this.fittingDb = deps.fittingDb;
    this.i18n = deps.i18n;
    this.renderer = deps.ammoHintRenderer;
  }

  render(anchor: HTMLElement, container: HTMLElement): void {
    const id = anchor.getAttribute("data-value");
    if (id === null) return;
    const model = this.buildModel(id);
    if (model === undefined) return;
    this.renderer.render(model, container);
  }

  private buildModel(id: string): AmmoHintModel | undefined {
    const chargeStats = this.fittingDb.charges[id];
    if (chargeStats) return this.buildChargeModel(chargeStats);
    const missileStats = this.fittingDb.missiles[id];
    if (missileStats) return this.buildMissileModel(missileStats);
    return undefined;
  }

  private buildChargeModel(stats: NonNullable<FittingDb["charges"][string]>): AmmoHintModel {
    const typeRows: AmmoHintTypeRow[] = [];
    for (const type of DAMAGE_TYPE_ORDER) {
      const value = damageValue(stats, type);
      if (value) typeRows.push({ type, iconUrl: DAMAGE_ICON_URLS[type], value });
    }
    const totalDamage = typeRows.reduce((sum, row) => sum + row.value, 0);
    const modifiers: string[] = [];
    const rangeMultiplier = stats.rangeMultiplier ?? 1;
    const trackingMultiplier = stats.trackingMultiplier ?? 1;
    const falloffMultiplier = stats.falloffMultiplier ?? 1;
    if (rangeMultiplier !== 1) modifiers.push(`range x${formatMultiplier(rangeMultiplier)}`);
    if (falloffMultiplier !== 1) modifiers.push(`falloff x${formatMultiplier(falloffMultiplier)}`);
    if (trackingMultiplier !== 1) modifiers.push(`track x${formatMultiplier(trackingMultiplier)}`);
    return { typeRows, totalDamage, modifiers };
  }

  private buildMissileModel(stats: NonNullable<FittingDb["missiles"][string]>): AmmoHintModel {
    const type = stats.damageType as DamageType;
    return {
      typeRows: [{ type, iconUrl: DAMAGE_ICON_URLS[type], value: stats.damage }],
      totalDamage: stats.damage,
      modifiers: [],
    };
  }
}

function damageValue(stats: { readonly emDamage?: number; readonly thermalDamage?: number; readonly kineticDamage?: number; readonly explosiveDamage?: number }, type: DamageType): number | undefined {
  if (type === "em") return stats.emDamage;
  if (type === "thermal") return stats.thermalDamage;
  if (type === "kinetic") return stats.kineticDamage;
  return stats.explosiveDamage;
}

function formatMultiplier(value: number): string {
  return String(Number(value.toFixed(2)));
}
