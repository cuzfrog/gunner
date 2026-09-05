import type { SensorBoosterSpec, SensorBoostLoadout, SensorSpec, SignalAmplifierSpec } from "../../../sim";
import type { I18n } from "../../i18n";
import type { UiEvents } from "../../events";
import { formatWithCommas } from "../controlsFormat";
import { html } from "../markup";
import type { PopupGroup } from "../popup";
import { PopupField, SectionBlockImpl } from "../shared";
import type { Side } from "../side";
import type { TargetingController, TargetingEls } from "./targetingControllerContract";

export class TargetingControllerImpl implements TargetingController {
  private readonly els: TargetingEls;
  private readonly i18n: I18n;
  private readonly events: UiEvents;
  private readonly specs = new Map<Side, SensorSpec>();
  private readonly boosts = new Map<Side, SensorBoostLoadout>();
  private readonly sectionBlock: SectionBlockImpl;
  private readonly fields: Record<Side, PopupField>;

  constructor(deps: { els: TargetingEls; popupGroup: PopupGroup; i18n: I18n; events: UiEvents }) {
    this.els = deps.els;
    this.i18n = deps.i18n;
    this.events = deps.events;
    this.sectionBlock = new SectionBlockImpl();
    this.fields = {
      shipA: new PopupField({ els: deps.els.shipA, popupGroup: deps.popupGroup }),
      shipB: new PopupField({ els: deps.els.shipB, popupGroup: deps.popupGroup }),
    };
    this.events.onFittingImported((side, imported) => this.setSensorData(side, imported.sensorSpec, imported.sensorBoosts));
    this.events.onLanguageChanged(() => this.render());
    this.render();
  }

  setSensorData(side: Side, spec: SensorSpec | undefined, boosts: SensorBoostLoadout | undefined): void {
    if (spec) {
      this.specs.set(side, spec);
    } else {
      this.specs.delete(side);
    }
    if (boosts && (boosts.boosters.length > 0 || boosts.amplifiers.length > 0)) {
      this.boosts.set(side, boosts);
    } else {
      this.boosts.delete(side);
    }
    this.renderSide(side);
  }

  render(): void {
    this.renderSide("shipA");
    this.renderSide("shipB");
  }

  private renderSide(side: Side): void {
    const field = this.fields[side];
    const section = field.clearSection();
    const spec = this.specs.get(side);
    const targetingLabel = this.i18n.t("label.targeting");
    field.applyLabel(targetingLabel);
    if (!spec) {
      field.setEnabled(false, this.i18n.t("title.targeting.empty"));
      this.updateSummary(side);
      field.close();
      return;
    }
    field.setEnabled(true, "");
    this.updateSummary(side);
    if (!section) return;
    const heading = html`<div class="preview-section-label">${targetingLabel}</div>`;
    section.appendChild(heading);
    this.renderSensorAttributes(section, spec);
    this.renderBoosterModules(section, side);
    this.renderAmplifierModules(section, side);
    field.close();
  }

  private renderSensorAttributes(section: HTMLElement, spec: SensorSpec): void {
    const rows: (Element | DocumentFragment)[] = [
      html`<div class="targeting-attr-row"><span class="targeting-attr-label">${this.i18n.t("targeting.scanResolution")}</span><span class="targeting-attr-value mono">${formatWithCommas(spec.scanResolution)}${this.i18n.t("unit.mm")}</span></div>`,
      html`<div class="targeting-attr-row"><span class="targeting-attr-label">${this.i18n.t("targeting.maxTargetingRange")}</span><span class="targeting-attr-value mono">${formatWithCommas(spec.maxTargetingRange)}${this.i18n.t("unit.meter")}</span></div>`,
      html`<div class="targeting-attr-row"><span class="targeting-attr-label">${this.i18n.t("targeting.maxLockedTargets")}</span><span class="targeting-attr-value mono">${String(spec.maxLockedTargets)}</span></div>`,
    ];
    const block = this.sectionBlock.create(this.i18n.t("targeting.attributes"), rows);
    section.appendChild(block);
  }

  private renderBoosterModules(section: HTMLElement, side: Side): void {
    const boosts = this.boosts.get(side);
    if (!boosts || boosts.boosters.length === 0) return;
    const rows: (Element | DocumentFragment)[] = [];
    for (const booster of boosts.boosters) {
      const stats = boosterStatsText(booster, this.i18n);
      const row = html`<div class="targeting-module-row"><span class="targeting-module-name">${booster.moduleName}</span><span class="targeting-module-stats mono">${stats}</span></div>`;
      rows.push(row);
    }
    const block = this.sectionBlock.create(this.i18n.t("targeting.sensorBoosters"), rows);
    section.appendChild(block);
  }

  private renderAmplifierModules(section: HTMLElement, side: Side): void {
    const boosts = this.boosts.get(side);
    if (!boosts || boosts.amplifiers.length === 0) return;
    const rows: (Element | DocumentFragment)[] = [];
    for (const amplifier of boosts.amplifiers) {
      const stats = amplifierStatsText(amplifier, this.i18n);
      const row = html`<div class="targeting-module-row"><span class="targeting-module-name">${amplifier.moduleName}</span><span class="targeting-module-stats mono">${stats}</span></div>`;
      rows.push(row);
    }
    const block = this.sectionBlock.create(this.i18n.t("targeting.signalAmplifiers"), rows);
    section.appendChild(block);
  }

  private updateSummary(side: Side): void {
    const summary = this.els[side].summary;
    const spec = this.specs.get(side);
    summary.innerHTML = "";
    if (!spec) {
      summary.textContent = "";
      return;
    }
    const item = html`<span class="trigger-summary-item"><span class="trigger-summary-count mono">${formatWithCommas(spec.maxTargetingRange)}${this.i18n.t("unit.meter")}</span></span>`;
    summary.appendChild(item);
  }
}

function boosterStatsText(booster: SensorBoosterSpec, i18n: I18n): string {
  const parts: string[] = [];
  if (booster.scanResolutionBonusPercent !== 0) parts.push(`${formatSignedPercent(booster.scanResolutionBonusPercent)} ${i18n.t("targeting.scanResolution")}`);
  if (booster.maxTargetRangeBonusPercent !== 0) parts.push(`${formatSignedPercent(booster.maxTargetRangeBonusPercent)} ${i18n.t("targeting.maxTargetingRange")}`);
  if (booster.overloadStrengthBonusPercent !== 0) parts.push(`${formatSignedPercent(booster.overloadStrengthBonusPercent)} ${i18n.t("targeting.overload")}`);
  return parts.join(" · ");
}

function amplifierStatsText(amplifier: SignalAmplifierSpec, i18n: I18n): string {
  const parts: string[] = [];
  if (amplifier.scanResolutionBonusPercent !== 0) parts.push(`${formatSignedPercent(amplifier.scanResolutionBonusPercent)} ${i18n.t("targeting.scanResolution")}`);
  if (amplifier.maxTargetRangeBonusPercent !== 0) parts.push(`${formatSignedPercent(amplifier.maxTargetRangeBonusPercent)} ${i18n.t("targeting.maxTargetingRange")}`);
  if (amplifier.maxLockedTargetsBonus !== 0) parts.push(`${amplifier.maxLockedTargetsBonus > 0 ? "+" : ""}${amplifier.maxLockedTargetsBonus} ${i18n.t("targeting.maxLockedTargets")}`);
  return parts.join(" · ");
}

function formatSignedPercent(value: number): string {
  return `${value > 0 ? "+" : ""}${value}%`;
}
