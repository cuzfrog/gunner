import { html } from "../markup";

export interface StatHintRow {
  readonly label?: string;
  readonly iconUrl?: string;
  readonly value: string;
  readonly emphasis?: boolean;
}

export interface StatHintSection {
  readonly heading?: string;
  readonly rows: readonly StatHintRow[];
}

export interface StatHintResistRow {
  readonly layer: string;
  readonly values: readonly string[];
}

export interface StatHintResists {
  readonly heading: string;
  readonly columns: readonly string[];
  readonly rows: readonly StatHintResistRow[];
}

export interface StatHintModel {
  readonly name?: string;
  readonly subtitle?: string;
  readonly sections: readonly StatHintSection[];
  readonly resists?: StatHintResists;
}

export interface StatHintRenderer {
  render(model: StatHintModel, container: HTMLElement): void;
}

export class StatHintRendererImpl implements StatHintRenderer {
  render(model: StatHintModel, container: HTMLElement): void {
    const root = html`<div class="stat-hint"></div>` as unknown as HTMLElement;
    if (model.name !== undefined) root.appendChild(renderHeader(model.name, model.subtitle));
    for (const section of model.sections) {
      root.appendChild(renderSection(section));
    }
    if (model.resists !== undefined) root.appendChild(renderResists(model.resists));
    container.appendChild(root);
  }
}

function renderHeader(name: string, subtitle: string | undefined): HTMLElement {
  return html`<div class="stat-hint-header">
    <span class="stat-hint-name">${name}</span>
    ${subtitle === undefined ? "" : html`<span class="stat-hint-subtitle">${subtitle}</span>`}
  </div>` as unknown as HTMLElement;
}

function renderSection(section: StatHintSection): HTMLElement {
  const className = section.heading === undefined ? "stat-hint-section stat-hint-section-divided" : "stat-hint-section";
  const el = html`<div class=${className}></div>` as unknown as HTMLElement;
  if (section.heading !== undefined) {
    el.appendChild(html`<div class="stat-hint-section-label">${section.heading}</div>` as unknown as HTMLElement);
  }
  for (const row of section.rows) {
    el.appendChild(renderRow(row));
  }
  return el;
}

function renderRow(row: StatHintRow): HTMLElement {
  const className = row.iconUrl !== undefined
    ? row.emphasis === true ? "stat-hint-row stat-hint-row-icon stat-hint-row-emphasis" : "stat-hint-row stat-hint-row-icon"
    : row.emphasis === true ? "stat-hint-row stat-hint-row-emphasis" : "stat-hint-row";
  const children: (Element | DocumentFragment)[] = [];
  if (row.iconUrl !== undefined) children.push(html`<img class="stat-hint-icon" src=${row.iconUrl} alt="">`);
  if (row.label !== undefined) children.push(html`<span class="stat-hint-label">${row.label}</span>`);
  children.push(html`<span class="stat-hint-value">${row.value}</span>`);
  return html`<div class=${className}>${children}</div>` as unknown as HTMLElement;
}

function renderResists(resists: StatHintResists): HTMLElement {
  const el = html`<div class="stat-hint-section">
    <div class="stat-hint-section-label">${resists.heading}</div>
  </div>` as unknown as HTMLElement;
  const grid = html`<div class="stat-hint-resists"></div>` as unknown as HTMLElement;
  grid.appendChild(html`<span class="stat-hint-resists-layer"></span>` as unknown as HTMLElement);
  for (const column of resists.columns) {
    grid.appendChild(html`<span class="stat-hint-resists-col">${column}</span>` as unknown as HTMLElement);
  }
  for (const row of resists.rows) {
    grid.appendChild(html`<span class="stat-hint-resists-layer">${row.layer}</span>` as unknown as HTMLElement);
    for (const value of row.values) {
      grid.appendChild(html`<span class="stat-hint-resists-value">${value}</span>` as unknown as HTMLElement);
    }
  }
  el.appendChild(grid);
  return el;
}
