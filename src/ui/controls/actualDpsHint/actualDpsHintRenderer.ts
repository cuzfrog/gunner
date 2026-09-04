import type { DamageType } from "../../../sim";
import { formatWithCommas } from "../controlsFormat";
import { html } from "../markup";

export interface ActualDpsHintTypeRow {
  readonly type: DamageType;
  readonly iconUrl: string;
  readonly appliedDps: number;
  readonly resist: number;
  readonly actualDps: number;
}

export interface ActualDpsHintModel {
  readonly types: readonly ActualDpsHintTypeRow[];
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
    for (const row of model.types) {
      root.appendChild(renderTypeRow(row, t));
    }
    root.appendChild(renderSummary(model, t));
    container.appendChild(root);
  }
}

function renderTypeRow(row: ActualDpsHintTypeRow, t: (key: string) => string): HTMLElement {
  const typeLabel = t(`dpsHint.damageType.${row.type}`);
  const passThrough = 1 - row.resist;
  const formula = `${formatWithCommas(row.appliedDps, 1)} × ${formatPercent(passThrough)} = ${formatWithCommas(row.actualDps, 1)}`;
  return html`<div class="dps-hint-row">
    <img class="dps-hint-type-icon" src=${row.iconUrl} alt="">
    <span class="dps-hint-label">${typeLabel}</span>
    <span class="dps-hint-value">${formula}</span>
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

function formatPercent(value: number): string {
  return `${formatWithCommas(value * 100, 1)}%`;
}
