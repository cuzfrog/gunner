import type { DamageType } from "../../../fitting";
import { html } from "../markup";

export interface AmmoHintTypeRow {
  readonly type: DamageType;
  readonly iconUrl: string;
  readonly value: number;
}

export interface AmmoHintModel {
  readonly typeRows: readonly AmmoHintTypeRow[];
  readonly totalDamage: number;
  readonly modifiers: readonly string[];
}

export interface AmmoHintRendererDeps {
  readonly t: (key: string) => string;
}

export interface AmmoHintRenderer {
  render(model: AmmoHintModel, container: HTMLElement): void;
}

export class AmmoHintRendererImpl implements AmmoHintRenderer {
  private readonly t: (key: string) => string;

  constructor(deps: AmmoHintRendererDeps) {
    this.t = deps.t;
  }

  render(model: AmmoHintModel, container: HTMLElement): void {
    if (model.typeRows.length === 0) return;
    const root = html`<div class="ammo-hint"></div>` as unknown as HTMLElement;
    for (const row of model.typeRows) {
      root.appendChild(renderTypeRow(row, this.t));
    }
    root.appendChild(renderTotalRow(model.totalDamage, this.t));
    if (model.modifiers.length > 0) {
      root.appendChild(renderModifiersRow(model.modifiers));
    }
    container.appendChild(root);
  }
}

function renderTypeRow(row: AmmoHintTypeRow, t: (key: string) => string): HTMLElement {
  const label = t(`dpsHint.damageType.${row.type}`);
  return html`<div class="ammo-hint-row">
    <img class="ammo-hint-type-icon" src=${row.iconUrl} alt="">
    <span class="ammo-hint-label">${label}</span>
    <span class="ammo-hint-value">${formatNumber(row.value, 1)}</span>
  </div>` as unknown as HTMLElement;
}

function renderTotalRow(totalDamage: number, t: (key: string) => string): HTMLElement {
  return html`<div class="ammo-hint-row ammo-hint-total-row">
    <span class="ammo-hint-label">${t("dpsHint.ammo")}</span>
    <span class="ammo-hint-value">${formatNumber(totalDamage, 1)}</span>
  </div>` as unknown as HTMLElement;
}

function renderModifiersRow(modifiers: readonly string[]): HTMLElement {
  return html`<div class="ammo-hint-modifiers">${modifiers.join(" · ")}</div>` as unknown as HTMLElement;
}

function formatNumber(value: number, decimals: number): string {
  return String(Number(value.toFixed(decimals)));
}
