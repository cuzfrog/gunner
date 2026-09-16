import { toShipId } from "../../../gamedata/ids";
import type { ShipProfile, Ships } from "../../../ships";
import type { I18n } from "../../i18n";
import type { HintContentProvider } from "../hoverHint";
import { formatNumber, formatWithCommas } from "../controlsFormat";
import type { StatHintModel, StatHintRenderer, StatHintResists, StatHintResistRow, StatHintRow, StatHintSection } from "../statHint";

export type ShipHintProvider = HintContentProvider;

export interface ShipHintProviderDeps {
  readonly ships: Ships;
  readonly i18n: I18n;
  readonly statHintRenderer: StatHintRenderer;
}

export class ShipHintProviderImpl implements ShipHintProvider {
  private readonly ships: Ships;
  private readonly i18n: I18n;
  private readonly renderer: StatHintRenderer;

  constructor(deps: ShipHintProviderDeps) {
    this.ships = deps.ships;
    this.i18n = deps.i18n;
    this.renderer = deps.statHintRenderer;
  }

  render(anchor: HTMLElement, container: HTMLElement): void {
    const id = anchor.getAttribute("data-value");
    if (id === null || id === "") return;
    const profile = this.profileFor(id);
    if (profile === undefined) return;
    this.renderer.render(this.buildModel(profile), container);
  }

  private profileFor(id: string): ShipProfile | undefined {
    try {
      return this.ships.findHullById(toShipId(id));
    } catch {
      return undefined;
    }
  }

  private buildModel(profile: ShipProfile): StatHintModel {
    const view = this.ships.hullView(profile, this.i18n.current());
    const sections = [
      this.fittingSection(profile),
      this.navigationSection(profile),
      this.targetingSection(profile),
      this.droneSection(profile),
      this.capacitorSection(profile),
      this.defenseSection(profile),
    ].filter((section): section is StatHintSection => section !== undefined);
    return { name: view.name, subtitle: `${view.hullType} · ${view.faction}`, sections, resists: this.resists(profile) };
  }

  private fittingSection(profile: ShipProfile): StatHintSection {
    return {
      heading: this.t("shipHint.section.fitting"),
      rows: [
        { label: this.t("shipHint.highSlots"), value: String(profile.highSlots) },
        { label: this.t("shipHint.medSlots"), value: String(profile.medSlots) },
        { label: this.t("shipHint.lowSlots"), value: String(profile.lowSlots) },
        { label: this.t("shipHint.rigSlots"), value: String(profile.rigSlots) },
      ],
    };
  }

  private navigationSection(profile: ShipProfile): StatHintSection {
    return {
      heading: this.t("shipHint.section.navigation"),
      rows: [
        { label: this.t("label.maxVelocity"), value: `${formatWithCommas(profile.baseSpeed)} ${this.t("unit.meterPerSecond")}` },
        { label: this.t("shipHint.mass"), value: `${formatWithCommas(profile.mass)} ${this.t("unit.kilogram")}` },
        { label: this.t("shipHint.inertiaModifier"), value: `${formatNumber(profile.inertiaModifier, 3)}x` },
        { label: this.t("shipHint.signatureRadius"), value: `${quantityLabel(profile.sigRadius, 1)} ${this.t("unit.meter")}` },
      ],
    };
  }

  private targetingSection(profile: ShipProfile): StatHintSection {
    return {
      heading: this.t("shipHint.section.targeting"),
      rows: [
        { label: this.t("label.scanResolution"), value: `${formatWithCommas(profile.scanResolution)} ${this.t("unit.mm")}` },
        { label: this.t("label.targetingRange"), value: `${quantityLabel(profile.maxTargetingRange / 1000, 1)} ${this.t("unit.kilometer")}` },
        { label: this.t("label.maxLockedTargets"), value: String(profile.maxLockedTargets) },
      ],
    };
  }

  private droneSection(profile: ShipProfile): StatHintSection | undefined {
    if (profile.droneBandwidth === 0 && profile.droneCapacity === 0) return undefined;
    return {
      heading: this.t("shipHint.section.drones"),
      rows: [
        { label: this.t("shipHint.droneBandwidth"), value: `${formatWithCommas(profile.droneBandwidth)} ${this.t("unit.droneBandwidth")}` },
        { label: this.t("shipHint.droneCapacity"), value: `${formatWithCommas(profile.droneCapacity)} ${this.t("unit.cubicMeter")}` },
      ],
    };
  }

  private capacitorSection(profile: ShipProfile): StatHintSection {
    return {
      heading: this.t("shipHint.section.capacitor"),
      rows: [
        { label: this.t("shipHint.capacitorCapacity"), value: `${formatWithCommas(profile.capacitorCapacity)} ${this.t("unit.gigajoule")}` },
        { label: this.t("shipHint.capacitorRecharge"), value: `${quantityLabel(profile.capacitorRechargeTime, 2)} ${this.t("unit.second")}` },
      ],
    };
  }

  private defenseSection(profile: ShipProfile): StatHintSection {
    return {
      heading: this.t("shipHint.section.defense"),
      rows: [
        { label: this.t("defense.layer.shield"), value: `${formatWithCommas(profile.shieldHp)} ${this.t("defense.hp")}` },
        { label: this.t("defense.layer.armor"), value: `${formatWithCommas(profile.armorHp)} ${this.t("defense.hp")}` },
        { label: this.t("defense.layer.hull"), value: `${formatWithCommas(profile.hullHp)} ${this.t("defense.hp")}` },
      ],
    };
  }

  private resists(profile: ShipProfile): StatHintResists {
    return {
      heading: this.t("shipHint.section.resists"),
      columns: [
        this.t("dpsHint.damageType.em"),
        this.t("dpsHint.damageType.thermal"),
        this.t("dpsHint.damageType.kinetic"),
        this.t("dpsHint.damageType.explosive"),
      ],
      rows: [
        resistRow(this.t("defense.layer.shield"), profile.shieldResists),
        resistRow(this.t("defense.layer.armor"), profile.armorResists),
        resistRow(this.t("defense.layer.hull"), profile.hullResists),
      ],
    };
  }

  private t(key: string): string {
    return this.i18n.t(key);
  }
}

function resistRow(layer: string, resists: ShipProfile["shieldResists"]): StatHintResistRow {
  return {
    layer,
    values: [resists.em, resists.thermal, resists.kinetic, resists.explosive].map((resist) => percentLabel(resist)),
  };
}

function percentLabel(resist: number): string {
  return `${Math.round(resist * 1000) / 10}%`;
}

function quantityLabel(value: number, decimals: number): string {
  return Number.isInteger(value) ? formatWithCommas(value) : formatNumber(value, decimals);
}
