import type { DamageFactorKind, DamageType } from "../../../fitting";
import { html } from "../markup";

export interface DpsHintTypeRow {
  readonly type: DamageType;
  readonly iconUrl: string;
  readonly damage: number;
  readonly percent: number;
}

export interface DpsHintFactorRow {
  readonly kind: DamageFactorKind;
  readonly multiplier: number;
  readonly cumulative: number;
  readonly source: string | undefined;
}

export interface DpsHintGroup {
  readonly name: string;
  readonly types: readonly DpsHintTypeRow[];
  readonly sum: number;
  readonly factors: readonly DpsHintFactorRow[];
}

export interface DpsHintModel {
  readonly groups: readonly DpsHintGroup[];
}

export interface DpsHintRendererDeps {
  readonly t: (key: string) => string;
}

export interface DpsHintRenderer {
  render(model: DpsHintModel, container: HTMLElement): void;
}

export class DpsHintRendererImpl implements DpsHintRenderer {
  private readonly t: (key: string) => string;

  constructor(deps: DpsHintRendererDeps) {
    this.t = deps.t;
  }

  render(model: DpsHintModel, container: HTMLElement): void {
    const root = html`<div class="dps-hint"></div>` as unknown as HTMLElement;
    for (const group of model.groups) {
      root.appendChild(renderGroup(group, this.t));
    }
    container.appendChild(root);
  }
}

function renderGroup(group: DpsHintGroup, t: (key: string) => string): HTMLElement {
  const el = html`<div class="dps-hint-group"></div>` as unknown as HTMLElement;
  el.appendChild(html`<div class="dps-hint-group-name">${group.name}</div>`);
  for (const row of group.types) {
    el.appendChild(renderTypeRow(row, t));
  }
  el.appendChild(renderSumRow(group.sum, t));
  for (const factor of group.factors) {
    el.appendChild(renderFactorRow(factor, t));
  }
  return el;
}

function renderTypeRow(row: DpsHintTypeRow, t: (key: string) => string): HTMLElement {
  const label = t(`dpsHint.damageType.${row.type}`);
  return html`<div class="dps-hint-row">
    <img class="dps-hint-type-icon" src=${row.iconUrl} alt="">
    <span class="dps-hint-label">${label}</span>
    <span class="dps-hint-value">${formatWithCommas(row.damage, 1)}</span>
    <span class="dps-hint-percent">${formatPercent(row.percent)}</span>
  </div>` as unknown as HTMLElement;
}

function renderSumRow(sum: number, t: (key: string) => string): HTMLElement {
  return html`<div class="dps-hint-row dps-hint-sum-row">
    <span class="dps-hint-label">${t("dpsHint.sum")}</span>
    <span class="dps-hint-value">${formatWithCommas(sum, 1)}</span>
  </div>` as unknown as HTMLElement;
}

function renderFactorRow(factor: DpsHintFactorRow, t: (key: string) => string): HTMLElement {
  const kindLabel = t(`dpsHint.factor.${factor.kind}`);
  const source = factor.source !== undefined ? renderFactorSource(factor.source) : null;
  return html`<div class="dps-hint-factor-row">
    <span class="dps-hint-factor-kind">${kindLabel}</span>
    <span class="dps-hint-factor-multi">x${formatMultiplier(factor.multiplier)}</span>
    <span class="dps-hint-factor-cumulative">(x${formatMultiplier(factor.cumulative)})</span>
    ${source}
  </div>` as unknown as HTMLElement;
}

function renderFactorSource(source: string): HTMLElement {
  return html`<span class="dps-hint-factor-source">${source}</span>` as unknown as HTMLElement;
}

function formatWithCommas(value: number, decimals = 0): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatMultiplier(value: number): string {
  return String(Number(value.toFixed(2)));
}

function formatPercent(value: number): string {
  return `${formatWithCommas(value * 100, 0)}%`;
}
