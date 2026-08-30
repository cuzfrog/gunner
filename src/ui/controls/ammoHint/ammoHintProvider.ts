import type { DamageType } from "../../../fitting";
import type { ChargeStats, FittingDb, MissileStats } from "../../../gamedata/fittingDb";
import type { HintContentProvider } from "../hoverHint";
import { formatMultiplier } from "../controlsFormat";
import { DAMAGE_ICON_URLS, DAMAGE_TYPE_ORDER } from "../damageTypeIcons";
import type { AmmoHintModel, AmmoHintRenderer, AmmoHintTypeRow } from "./ammoHintRenderer";

export type AmmoHintProvider = HintContentProvider;

export interface AmmoHintProviderDeps {
  readonly fittingDb: FittingDb;
  readonly ammoHintRenderer: AmmoHintRenderer;
}

export class AmmoHintProviderImpl implements AmmoHintProvider {
  private readonly fittingDb: FittingDb;
  private readonly renderer: AmmoHintRenderer;

  constructor(deps: AmmoHintProviderDeps) {
    this.fittingDb = deps.fittingDb;
    this.renderer = deps.ammoHintRenderer;
  }

  render(anchor: HTMLElement, container: HTMLElement): void {
    const id = anchor.getAttribute("data-value");
    if (id === null) return;
    const model = this.buildModel(id);
    if (model === undefined) return;
    if (model.typeRows.length === 0) return;
    this.renderer.render(model, container);
  }

  private buildModel(id: string): AmmoHintModel | undefined {
    const chargeStats = this.fittingDb.charges[id];
    if (chargeStats) return this.buildChargeModel(chargeStats);
    const missileStats = this.fittingDb.missiles[id];
    if (missileStats) return this.buildMissileModel(missileStats);
    return undefined;
  }

  private buildChargeModel(stats: ChargeStats): AmmoHintModel {
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

  private buildMissileModel(stats: MissileStats): AmmoHintModel {
    const type = stats.damageType;
    return {
      typeRows: [{ type, iconUrl: DAMAGE_ICON_URLS[type], value: stats.damage }],
      totalDamage: stats.damage,
      modifiers: [],
    };
  }
}

function damageValue(stats: ChargeStats, type: DamageType): number | undefined {
  if (type === "em") return stats.emDamage;
  if (type === "thermal") return stats.thermalDamage;
  if (type === "kinetic") return stats.kineticDamage;
  return stats.explosiveDamage;
}
