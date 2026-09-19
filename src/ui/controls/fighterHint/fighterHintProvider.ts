import type { FighterStats, FittingDb } from "../../../gamedata/fittingDb";
import type { DamageType } from "../../../fitting";
import type { I18n } from "../../i18n";
import type { HintContentProvider } from "../hoverHint";
import { formatDistance, formatNumber, formatWithCommas } from "../controlsFormat";
import { DAMAGE_ICON_URLS, DAMAGE_TYPE_ORDER } from "../damageTypeIcons";
import type { StatHintModel, StatHintRenderer, StatHintRow, StatHintSection } from "../statHint";

export type FighterHintProvider = HintContentProvider;

export interface FighterHintProviderDeps {
  readonly fittingDb: FittingDb;
  readonly i18n: I18n;
  readonly statHintRenderer: StatHintRenderer;
}

export class FighterHintProviderImpl implements FighterHintProvider {
  private readonly fittingDb: FittingDb;
  private readonly i18n: I18n;
  private readonly renderer: StatHintRenderer;

  constructor(deps: FighterHintProviderDeps) {
    this.fittingDb = deps.fittingDb;
    this.i18n = deps.i18n;
    this.renderer = deps.statHintRenderer;
  }

  render(anchor: HTMLElement, container: HTMLElement): void {
    const id = anchor.getAttribute("data-value");
    if (id === null || id === "") return;
    const stats = this.fittingDb.fighters[id];
    if (stats === undefined) return;
    this.renderer.render(this.buildModel(stats), container);
  }

  private buildModel(stats: FighterStats): StatHintModel {
    const sections: StatHintSection[] = [];
    if (stats.attack) sections.push(this.damageSection(stats));
    sections.push(this.navigationSection(stats), this.fitSection(stats));
    return { sections };
  }

  private damageSection(stats: FighterStats): StatHintSection {
    const attack = stats.attack!;
    const rows: StatHintRow[] = [{ label: this.t("ammoHint.total"), value: formatNumber(totalDamage(stats), 1), emphasis: true }];
    for (const type of DAMAGE_TYPE_ORDER) {
      const value = damageValue(stats, type);
      if (value > 0) rows.push({ label: this.t(`dpsHint.damageType.${type}`), iconUrl: DAMAGE_ICON_URLS[type], value: formatNumber(value, 1) });
    }
    rows.push({ label: this.t("label.rateOfFire"), value: `${formatNumber(attack.cycleTime, 1)} ${this.t("unit.second")}` });
    return { heading: this.t("dpsHint.damage"), rows };
  }

  private navigationSection(stats: FighterStats): StatHintSection {
    return {
      heading: this.t("shipHint.section.navigation"),
      rows: [
        { label: this.t("label.maxVelocity"), value: `${formatWithCommas(stats.maxVelocity)} ${this.t("unit.meterPerSecond")}` },
        { label: this.t("droneHint.orbitRange"), value: formatDistance(stats.orbitRange, (key) => this.t(key)) },
      ],
    };
  }

  private fitSection(stats: FighterStats): StatHintSection {
    return {
      heading: this.t("droneHint.section.fit"),
      rows: [
        { label: this.t("fighter.squadronMaxSize"), value: String(stats.squadronMaxSize) },
        { label: this.t("droneHint.volume"), value: `${formatWithCommas(stats.volume)} ${this.t("unit.cubicMeter")}` },
      ],
    };
  }

  private t(key: string): string {
    return this.i18n.t(key);
  }
}

function totalDamage(stats: FighterStats): number {
  const attack = stats.attack!;
  return (attack.emDamage + attack.thermalDamage + attack.kineticDamage + attack.explosiveDamage) * attack.damageMultiplier;
}

function damageValue(stats: FighterStats, type: DamageType): number {
  const attack = stats.attack!;
  const base = type === "em" ? attack.emDamage : type === "thermal" ? attack.thermalDamage : type === "kinetic" ? attack.kineticDamage : attack.explosiveDamage;
  return base * attack.damageMultiplier;
}
