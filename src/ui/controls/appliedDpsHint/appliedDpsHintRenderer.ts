import type { WeaponKind } from "../../../sim";
import { formatWithCommas } from "../../format";
import { html } from "../markup";

export interface AppliedDpsHintRow {
  readonly weaponKind: WeaponKind;
  readonly nominalDps: number;
  readonly appliedDps: number;
  readonly application: number;
}

export interface AppliedDpsHintModel {
  readonly rows: readonly AppliedDpsHintRow[];
  readonly totalNominalDps: number;
  readonly totalAppliedDps: number;
  readonly totalApplication: number;
}

export interface AppliedDpsHintRendererDeps {
  readonly t: (key: string) => string;
}

export interface AppliedDpsHintRenderer {
  render(model: AppliedDpsHintModel, container: HTMLElement): void;
}

export class AppliedDpsHintRendererImpl implements AppliedDpsHintRenderer {
  private readonly t: (key: string) => string;

  constructor(deps: AppliedDpsHintRendererDeps) {
    this.t = deps.t;
  }

  render(model: AppliedDpsHintModel, container: HTMLElement): void {
    const root = html`<div class="dps-hint"></div>` as unknown as HTMLElement;
    for (const row of model.rows) {
      root.appendChild(renderRow(row, this.t));
    }
    root.appendChild(renderTotal(model, this.t));
    container.appendChild(root);
  }
}

function renderRow(row: AppliedDpsHintRow, t: (key: string) => string): HTMLElement {
  const kindLabel = t(`dpsHint.${row.weaponKind}Dps`);
  return html`<div class="dps-hint-group">
    <div class="dps-hint-group-name">${kindLabel}</div>
    <div class="dps-hint-row dps-hint-summary-row">
      <span class="dps-hint-label">${t("appliedDpsHint.nominal")}</span>
      <span class="dps-hint-value">${formatWithCommas(row.nominalDps, 1)}</span>
    </div>
    <div class="dps-hint-row dps-hint-summary-row">
      <span class="dps-hint-label">${t("appliedDpsHint.applied")}</span>
      <span class="dps-hint-value">${formatWithCommas(row.appliedDps, 1)}</span>
    </div>
    <div class="dps-hint-row dps-hint-dps-row">
      <span class="dps-hint-label">${t("appliedDpsHint.application")}</span>
      <span class="dps-hint-value">${formatPercent(row.application)}</span>
    </div>
  </div>` as unknown as HTMLElement;
}

function renderTotal(model: AppliedDpsHintModel, t: (key: string) => string): HTMLElement {
  return html`<div class="dps-hint-summary">
    <div class="dps-hint-row dps-hint-summary-row">
      <span class="dps-hint-label">${t("appliedDpsHint.totalNominal")}</span>
      <span class="dps-hint-value">${formatWithCommas(model.totalNominalDps, 1)}</span>
    </div>
    <div class="dps-hint-row dps-hint-summary-row">
      <span class="dps-hint-label">${t("appliedDpsHint.totalApplied")}</span>
      <span class="dps-hint-value">${formatWithCommas(model.totalAppliedDps, 1)}</span>
    </div>
    <div class="dps-hint-row dps-hint-dps-row">
      <span class="dps-hint-label">${t("appliedDpsHint.totalApplication")}</span>
      <span class="dps-hint-value">${formatPercent(model.totalApplication)}</span>
    </div>
  </div>` as unknown as HTMLElement;
}

function formatPercent(value: number): string {
  return `${formatWithCommas(value * 100, 1)}%`;
}
