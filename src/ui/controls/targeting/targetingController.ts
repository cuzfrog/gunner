import type { SensorSpec } from "../../../sim";
import type { SensorBoosterResolver } from "../../../sim";
import type { I18n } from "../../i18n";
import type { UiEvents } from "../../events";
import { formatWithCommas } from "../controlsFormat";
import { html } from "../markup";
import type { PopupGroup } from "../popup";
import { PopupField, SectionBlockImpl } from "../shared";
import type { SensorBoosterController } from "../sensorBooster";
import type { Side } from "../side";
import type { TargetingController, TargetingEls } from "./targetingControllerContract";

export class TargetingControllerImpl implements TargetingController {
  private readonly els: TargetingEls;
  private readonly i18n: I18n;
  private readonly events: UiEvents;
  private readonly sensorBoosterController: SensorBoosterController;
  private readonly resolver: SensorBoosterResolver;
  private readonly specs = new Map<Side, SensorSpec>();
  private readonly sectionBlock: SectionBlockImpl;
  private readonly fields: Record<Side, PopupField>;

  constructor(deps: { els: TargetingEls; popupGroup: PopupGroup; i18n: I18n; events: UiEvents; sensorBoosterController: SensorBoosterController; resolver: SensorBoosterResolver }) {
    this.els = deps.els;
    this.i18n = deps.i18n;
    this.events = deps.events;
    this.sensorBoosterController = deps.sensorBoosterController;
    this.resolver = deps.resolver;
    this.sectionBlock = new SectionBlockImpl();
    this.fields = {
      shipA: new PopupField({ els: deps.els.shipA, popupGroup: deps.popupGroup }),
      shipB: new PopupField({ els: deps.els.shipB, popupGroup: deps.popupGroup }),
    };
    this.events.onFittingImported((side, imported) => this.setSensorData(side, imported.sensorSpec));
    this.events.onLanguageChanged(() => this.render());
    this.events.onConfigInvalidated(() => this.render());
    this.render();
  }

  setSensorData(side: Side, spec: SensorSpec | undefined): void {
    if (spec) {
      this.specs.set(side, spec);
    } else {
      this.specs.delete(side);
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
    const boosted = this.resolver.boostedSensorSpec(spec, this.sensorBoosterController.projection(side));
    this.renderSensorAttributes(section, boosted);
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

  private updateSummary(side: Side): void {
    const summary = this.els[side].summary;
    const spec = this.specs.get(side);
    summary.innerHTML = "";
    if (!spec) {
      summary.textContent = "";
      return;
    }
    const boosted = this.resolver.boostedSensorSpec(spec, this.sensorBoosterController.projection(side));
    const item = html`<span class="trigger-summary-item"><span class="trigger-summary-count mono">${formatWithCommas(boosted.maxTargetingRange)}${this.i18n.t("unit.meter")}</span></span>`;
    summary.appendChild(item);
  }
}
