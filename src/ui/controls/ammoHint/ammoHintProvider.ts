import type { DamageType } from "../../../fitting";
import type { ChargeStats, FittingDb, MissileStats } from "../../../gamedata/fittingDb";
import type { HintContentProvider } from "../hoverHint";
import { formatMultiplier, formatNumber } from "../controlsFormat";
import { DAMAGE_ICON_URLS, DAMAGE_TYPE_ORDER } from "../damageTypeIcons";
import type { AmmoHintAttributeRow, AmmoHintModel, AmmoHintRenderer, AmmoHintTypeRow } from "./ammoHintRenderer";

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
    const attributes: AmmoHintAttributeRow[] = [];
    const rangeMultiplier = stats.rangeMultiplier ?? 1;
    const trackingMultiplier = stats.trackingMultiplier ?? 1;
    const falloffMultiplier = stats.falloffMultiplier ?? 1;
    if (rangeMultiplier !== 1) attributes.push({ label: "range", value: `x${formatMultiplier(rangeMultiplier)}` });
    if (falloffMultiplier !== 1) attributes.push({ label: "falloff", value: `x${formatMultiplier(falloffMultiplier)}` });
    if (trackingMultiplier !== 1) attributes.push({ label: "track", value: `x${formatMultiplier(trackingMultiplier)}` });
    return { typeRows, totalDamage, attributes };
  }

  private buildMissileModel(stats: MissileStats): AmmoHintModel {
    const type = stats.damageType;
    return {
      typeRows: [{ type, iconUrl: DAMAGE_ICON_URLS[type], value: stats.damage }],
      totalDamage: stats.damage,
      attributes: [
        { label: "explosion radius", value: formatNumber(stats.explosionRadius, 0) },
        { label: "explosion velocity", value: formatNumber(stats.explosionVelocity, 0) },
        { label: "missile velocity", value: formatNumber(stats.maxVelocity, 0) },
        { label: "flight time", value: `${formatNumber(stats.flightTime, 1)}s` },
      ],
    };
  }
}

function damageValue(stats: ChargeStats, type: DamageType): number | undefined {
  if (type === "em") return stats.emDamage;
  if (type === "thermal") return stats.thermalDamage;
  if (type === "kinetic") return stats.kineticDamage;
  return stats.explosiveDamage;
}
