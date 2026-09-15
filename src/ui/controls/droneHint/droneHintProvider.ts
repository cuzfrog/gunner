import type { DroneStats, FittingDb } from "../../../gamedata/fittingDb";
import type { DamageType } from "../../../fitting";
import type { I18n } from "../../i18n";
import type { HintContentProvider } from "../hoverHint";
import { formatDistance, formatNumber, formatWithCommas } from "../controlsFormat";
import { DAMAGE_ICON_URLS, DAMAGE_TYPE_ORDER } from "../damageTypeIcons";
import type { StatHintModel, StatHintRenderer, StatHintRow, StatHintSection } from "../statHint";

export type DroneHintProvider = HintContentProvider;

export interface DroneHintProviderDeps {
  readonly fittingDb: FittingDb;
  readonly i18n: I18n;
  readonly statHintRenderer: StatHintRenderer;
}

export class DroneHintProviderImpl implements DroneHintProvider {
  private readonly fittingDb: FittingDb;
  private readonly i18n: I18n;
  private readonly renderer: StatHintRenderer;

  constructor(deps: DroneHintProviderDeps) {
    this.fittingDb = deps.fittingDb;
    this.i18n = deps.i18n;
    this.renderer = deps.statHintRenderer;
  }

  render(anchor: HTMLElement, container: HTMLElement): void {
    const id = anchor.getAttribute("data-value");
    if (id === null || id === "") return;
    const stats = this.fittingDb.combatDrones[id];
    if (stats === undefined) return;
    this.renderer.render(this.buildModel(stats), container);
  }

  private buildModel(stats: DroneStats): StatHintModel {
    return {
      sections: [
        this.damageSection(stats),
        this.targetingSection(stats),
        this.navigationSection(stats),
        this.fitSection(stats),
      ],
    };
  }

  private damageSection(stats: DroneStats): StatHintSection {
    const rows: StatHintRow[] = [{ label: this.t("ammoHint.total"), value: formatNumber(totalDamage(stats), 1), emphasis: true }];
    for (const type of DAMAGE_TYPE_ORDER) {
      const value = damageValue(stats, type);
      if (value > 0) rows.push({ label: this.t(`dpsHint.damageType.${type}`), iconUrl: DAMAGE_ICON_URLS[type], value: formatNumber(value, 1) });
    }
    rows.push({ label: this.t("droneHint.cycleTime"), value: `${formatNumber(stats.cycleTime, 1)} ${this.t("unit.second")}` });
    return { heading: this.t("dpsHint.damage"), rows };
  }

  private targetingSection(stats: DroneStats): StatHintSection {
    return {
      heading: this.t("shipHint.section.targeting"),
      rows: [
        { label: this.t("label.tracking"), value: `${formatNumber(stats.tracking, 3)} ${this.t("unit.radPerSecond")}` },
        { label: this.t("label.optimalRange"), value: formatDistance(stats.optimal, (key) => this.t(key)) },
        { label: this.t("label.falloffRange"), value: formatDistance(stats.falloff, (key) => this.t(key)) },
      ],
    };
  }

  private navigationSection(stats: DroneStats): StatHintSection {
    return {
      heading: this.t("shipHint.section.navigation"),
      rows: [
        { label: this.t("label.droneMaxVelocity"), value: `${formatWithCommas(stats.maxVelocity)} ${this.t("unit.meterPerSecond")}` },
        { label: this.t("label.droneOrbitSpeed"), value: `${formatWithCommas(stats.orbitSpeed)} ${this.t("unit.meterPerSecond")}` },
        { label: this.t("droneHint.orbitRange"), value: formatDistance(stats.orbitRange, (key) => this.t(key)) },
      ],
    };
  }

  private fitSection(stats: DroneStats): StatHintSection {
    return {
      heading: this.t("droneHint.section.fit"),
      rows: [
        { label: this.t("shipHint.droneBandwidth"), value: `${formatWithCommas(stats.bandwidth)} ${this.t("unit.droneBandwidth")}` },
        { label: this.t("droneHint.volume"), value: `${formatWithCommas(stats.volume)} ${this.t("unit.cubicMeter")}` },
      ],
    };
  }

  private t(key: string): string {
    return this.i18n.t(key);
  }
}

function totalDamage(stats: DroneStats): number {
  return (stats.emDamage + stats.thermalDamage + stats.kineticDamage + stats.explosiveDamage) * stats.damageMultiplier;
}

function damageValue(stats: DroneStats, type: DamageType): number {
  const base = type === "em" ? stats.emDamage : type === "thermal" ? stats.thermalDamage : type === "kinetic" ? stats.kineticDamage : stats.explosiveDamage;
  return base * stats.damageMultiplier;
}
