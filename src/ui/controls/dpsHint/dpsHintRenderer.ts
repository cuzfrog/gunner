import type { DamageFactorKind, DamageType } from "../../../fitting";
import type { WeaponKind } from "../../../sim";
import { formatWithCommas } from "../../format";
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
  readonly sources: readonly string[];
}

export interface DpsHintSummary {
  readonly ammo: number;
  readonly multiplier: number;
  readonly count: number;
  readonly volley: number;
  readonly cycleTime: number;
  readonly dps: number;
}

export interface DpsHintGroup {
  readonly name: string;
  readonly weaponKind: WeaponKind;
  readonly types: readonly DpsHintTypeRow[];
  readonly ammo: number;
  readonly factors: readonly DpsHintFactorRow[];
  readonly summary: DpsHintSummary;
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
  el.appendChild(renderAmmoRow(group.ammo, t));
  for (const factor of group.factors) {
    el.appendChild(renderFactorRow(factor, t));
  }
  el.appendChild(renderSummary(group.summary, group.weaponKind, t));
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

function renderAmmoRow(ammo: number, t: (key: string) => string): HTMLElement {
  return html`<div class="dps-hint-row dps-hint-sum-row">
    <span class="dps-hint-label">${t("dpsHint.ammo")}</span>
    <span class="dps-hint-value">${formatWithCommas(ammo, 1)}</span>
  </div>` as unknown as HTMLElement;
}

function renderFactorRow(factor: DpsHintFactorRow, t: (key: string) => string): HTMLElement {
  const kindLabel = t(`dpsHint.factor.${factor.kind}`);
  const el = html`<div class="dps-hint-factor-row">
    <div class="dps-hint-factor-main">
      <span class="dps-hint-factor-kind">${kindLabel}</span>
      <span class="dps-hint-factor-multi">x${formatMultiplier(factor.multiplier)}</span>
      <span class="dps-hint-factor-cumulative">(x${formatMultiplier(factor.cumulative)})</span>
    </div>
  </div>` as unknown as HTMLElement;
  for (const source of factor.sources) {
    el.appendChild(renderFactorSource(source));
  }
  return el;
}

function renderFactorSource(source: string): HTMLElement {
  return html`<div class="dps-hint-factor-source">${source}</div>` as unknown as HTMLElement;
}

function renderSummary(summary: DpsHintSummary, weaponKind: WeaponKind, t: (key: string) => string): HTMLElement {
  const volleyFormula = `${formatWithCommas(summary.ammo, 1)} × ${formatMultiplier(summary.multiplier)} × ${summary.count} = ${formatWithCommas(summary.volley, 1)}`;
  const dpsLabel = t(`dpsHint.${weaponKind}Dps`);
  return html`<div class="dps-hint-summary">
    <div class="dps-hint-row dps-hint-summary-row">
      <span class="dps-hint-label">${t("dpsHint.volley")}</span>
      <span class="dps-hint-value">${volleyFormula}</span>
    </div>
    <div class="dps-hint-row dps-hint-summary-row">
      <span class="dps-hint-label">${t("dpsHint.cycleTime")}</span>
      <span class="dps-hint-value">${formatWithCommas(summary.cycleTime, 2)}s</span>
    </div>
    <div class="dps-hint-row dps-hint-dps-row">
      <span class="dps-hint-label">${dpsLabel}</span>
      <span class="dps-hint-value">${formatWithCommas(summary.dps, 1)}</span>
    </div>
  </div>` as unknown as HTMLElement;
}

function formatMultiplier(value: number): string {
  return String(Number(value.toFixed(2)));
}

function formatPercent(value: number): string {
  return `${formatWithCommas(value * 100, 0)}%`;
}
