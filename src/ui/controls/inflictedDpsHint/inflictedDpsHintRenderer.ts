import type { DefenseLayer } from "../../../sim";
import { formatWithCommas } from "../controlsFormat";
import { html } from "../markup";

export interface InflictedDpsHintLayerRow {
  readonly layer: DefenseLayer;
  readonly inflicted: number;
}

export interface InflictedDpsHintModel {
  readonly layers: readonly InflictedDpsHintLayerRow[];
  readonly totalAppliedDps: number;
  readonly totalInflictedDps: number;
}

export interface InflictedDpsHintRendererDeps {
  readonly t: (key: string) => string;
}

export interface InflictedDpsHintRenderer {
  render(model: InflictedDpsHintModel, container: HTMLElement): void;
}

export class InflictedDpsHintRendererImpl implements InflictedDpsHintRenderer {
  private readonly t: (key: string) => string;

  constructor(deps: InflictedDpsHintRendererDeps) {
    this.t = deps.t;
  }

  render(model: InflictedDpsHintModel, container: HTMLElement): void {
    const t = this.t;
    const root = html`<div class="dps-hint"></div>` as unknown as HTMLElement;
    for (const row of model.layers) {
      if (row.inflicted <= 0) continue;
      root.appendChild(renderLayerRow(row, t));
    }
    root.appendChild(renderSummary(model, t));
    container.appendChild(root);
  }
}

function renderLayerRow(row: InflictedDpsHintLayerRow, t: (key: string) => string): HTMLElement {
  const layerLabel = t(`defense.layer.${row.layer}`);
  return html`<div class="dps-hint-row">
    <span class="dps-hint-label">${layerLabel}</span>
    <span class="dps-hint-value">${formatWithCommas(row.inflicted, 1)}</span>
  </div>` as unknown as HTMLElement;
}

function renderSummary(model: InflictedDpsHintModel, t: (key: string) => string): HTMLElement {
  return html`<div class="dps-hint-summary">
    <div class="dps-hint-row dps-hint-summary-row">
      <span class="dps-hint-label">${t("inflictedDpsHint.totalApplied")}</span>
      <span class="dps-hint-value">${formatWithCommas(model.totalAppliedDps, 1)}</span>
    </div>
    <div class="dps-hint-row dps-hint-dps-row">
      <span class="dps-hint-label">${t("inflictedDpsHint.totalInflicted")}</span>
      <span class="dps-hint-value">${formatWithCommas(model.totalInflictedDps, 1)}</span>
    </div>
  </div>` as unknown as HTMLElement;
}
