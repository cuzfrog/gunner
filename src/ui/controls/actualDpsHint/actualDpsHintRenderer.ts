import type { DefenseLayer } from "../../../sim";
import { formatWithCommas } from "../controlsFormat";
import { html } from "../markup";

export interface ActualDpsHintLayerRow {
  readonly layer: DefenseLayer;
  readonly hpLost: number;
}

export interface ActualDpsHintModel {
  readonly layers: readonly ActualDpsHintLayerRow[];
  readonly totalAppliedDps: number;
  readonly totalActualDps: number;
}

export interface ActualDpsHintRendererDeps {
  readonly t: (key: string) => string;
}

export interface ActualDpsHintRenderer {
  render(model: ActualDpsHintModel, container: HTMLElement): void;
}

export class ActualDpsHintRendererImpl implements ActualDpsHintRenderer {
  private readonly t: (key: string) => string;

  constructor(deps: ActualDpsHintRendererDeps) {
    this.t = deps.t;
  }

  render(model: ActualDpsHintModel, container: HTMLElement): void {
    const t = this.t;
    const root = html`<div class="dps-hint"></div>` as unknown as HTMLElement;
    for (const row of model.layers) {
      if (row.hpLost <= 0) continue;
      root.appendChild(renderLayerRow(row, t));
    }
    root.appendChild(renderSummary(model, t));
    container.appendChild(root);
  }
}

function renderLayerRow(row: ActualDpsHintLayerRow, t: (key: string) => string): HTMLElement {
  const layerLabel = t(`defense.layer.${row.layer}`);
  return html`<div class="dps-hint-row">
    <span class="dps-hint-label">${layerLabel}</span>
    <span class="dps-hint-value">${formatWithCommas(row.hpLost, 1)}</span>
  </div>` as unknown as HTMLElement;
}

function renderSummary(model: ActualDpsHintModel, t: (key: string) => string): HTMLElement {
  return html`<div class="dps-hint-summary">
    <div class="dps-hint-row dps-hint-summary-row">
      <span class="dps-hint-label">${t("actualDpsHint.totalApplied")}</span>
      <span class="dps-hint-value">${formatWithCommas(model.totalAppliedDps, 1)}</span>
    </div>
    <div class="dps-hint-row dps-hint-dps-row">
      <span class="dps-hint-label">${t("actualDpsHint.totalActual")}</span>
      <span class="dps-hint-value">${formatWithCommas(model.totalActualDps, 1)}</span>
    </div>
  </div>` as unknown as HTMLElement;
}
