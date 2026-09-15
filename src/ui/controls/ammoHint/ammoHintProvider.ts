import type { DamageType } from "../../../fitting";
import type { ChargeStats, FittingDb, MissileStats } from "../../../gamedata/fittingDb";
import type { I18n } from "../../i18n";
import type { HintContentProvider } from "../hoverHint";
import { formatMultiplier, formatNumber } from "../controlsFormat";
import { DAMAGE_ICON_URLS, DAMAGE_TYPE_ORDER } from "../damageTypeIcons";
import type { StatHintModel, StatHintRenderer, StatHintRow, StatHintSection } from "../statHint";

export type AmmoHintProvider = HintContentProvider;

export interface AmmoHintProviderDeps {
  readonly fittingDb: FittingDb;
  readonly i18n: I18n;
  readonly statHintRenderer: StatHintRenderer;
}

export class AmmoHintProviderImpl implements AmmoHintProvider {
  private readonly fittingDb: FittingDb;
  private readonly i18n: I18n;
  private readonly renderer: StatHintRenderer;

  constructor(deps: AmmoHintProviderDeps) {
    this.fittingDb = deps.fittingDb;
    this.i18n = deps.i18n;
    this.renderer = deps.statHintRenderer;
  }

  render(anchor: HTMLElement, container: HTMLElement): void {
    const id = anchor.getAttribute("data-value");
    if (id === null) return;
    const model = this.buildModel(id);
    if (model === undefined) return;
    this.renderer.render(model, container);
  }

  private buildModel(id: string): StatHintModel | undefined {
    const chargeStats = this.fittingDb.charges[id];
    if (chargeStats) return this.buildChargeModel(chargeStats);
    const missileStats = this.fittingDb.missiles[id];
    if (missileStats) return this.buildMissileModel(missileStats);
    return undefined;
  }

  private buildChargeModel(stats: ChargeStats): StatHintModel {
    const damageRows: StatHintRow[] = [{ label: this.t("ammoHint.total"), value: formatNumber(totalChargeDamage(stats), 1), emphasis: true }];
    for (const type of DAMAGE_TYPE_ORDER) {
      const value = damageValue(stats, type);
      if (value) damageRows.push({ label: this.typeLabel(type), iconUrl: DAMAGE_ICON_URLS[type], value: formatNumber(value, 1) });
    }
    const sections: StatHintSection[] = [{ heading: this.t("dpsHint.damage"), rows: damageRows }];
    const attributes = this.chargeAttributeRows(stats);
    if (attributes.length > 0) sections.push({ heading: undefined, rows: attributes });
    return { sections };
  }

  private buildMissileModel(stats: MissileStats): StatHintModel {
    const type = stats.damageType;
    return {
      sections: [
        {
          heading: this.t("dpsHint.damage"),
          rows: [
            { label: this.t("ammoHint.total"), value: formatNumber(stats.damage, 1), emphasis: true },
            { label: this.typeLabel(type), iconUrl: DAMAGE_ICON_URLS[type], value: formatNumber(stats.damage, 1) },
          ],
        },
        {
          heading: undefined,
          rows: [
            { label: this.t("ammoHint.explosionRadius"), value: formatNumber(stats.explosionRadius, 0) },
            { label: this.t("ammoHint.explosionVelocity"), value: formatNumber(stats.explosionVelocity, 0) },
            { label: this.t("ammoHint.missileVelocity"), value: formatNumber(stats.maxVelocity, 0) },
            { label: this.t("ammoHint.flightTime"), value: `${formatNumber(stats.flightTime, 1)}${this.t("unit.second")}` },
          ],
        },
      ],
    };
  }

  private chargeAttributeRows(stats: ChargeStats): StatHintRow[] {
    const rows: StatHintRow[] = [];
    const rangeMultiplier = stats.rangeMultiplier ?? 1;
    const trackingMultiplier = stats.trackingMultiplier ?? 1;
    const falloffMultiplier = stats.falloffMultiplier ?? 1;
    if (rangeMultiplier !== 1) rows.push({ label: this.t("ammoHint.range"), value: `x${formatMultiplier(rangeMultiplier)}` });
    if (falloffMultiplier !== 1) rows.push({ label: this.t("ammoHint.falloff"), value: `x${formatMultiplier(falloffMultiplier)}` });
    if (trackingMultiplier !== 1) rows.push({ label: this.t("label.tracking"), value: `x${formatMultiplier(trackingMultiplier)}` });
    return rows;
  }

  private typeLabel(type: DamageType): string {
    return this.t(`dpsHint.damageType.${type}`);
  }

  private t(key: string): string {
    return this.i18n.t(key);
  }
}

function totalChargeDamage(stats: ChargeStats): number {
  return (stats.emDamage ?? 0) + (stats.thermalDamage ?? 0) + (stats.kineticDamage ?? 0) + (stats.explosiveDamage ?? 0);
}

function damageValue(stats: ChargeStats, type: DamageType): number | undefined {
  if (type === "em") return stats.emDamage;
  if (type === "thermal") return stats.thermalDamage;
  if (type === "kinetic") return stats.kineticDamage;
  return stats.explosiveDamage;
}
