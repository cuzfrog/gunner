import { html } from "../markup";

export interface ShipHintRow {
  readonly label: string;
  readonly value: string;
}

export interface ShipHintSection {
  readonly heading: string;
  readonly rows: readonly ShipHintRow[];
}

export interface ShipHintResistRow {
  readonly layer: string;
  readonly values: readonly string[];
}

export interface ShipHintResists {
  readonly heading: string;
  readonly columns: readonly string[];
  readonly rows: readonly ShipHintResistRow[];
}

export interface ShipHintModel {
  readonly name: string;
  readonly subtitle: string;
  readonly sections: readonly ShipHintSection[];
  readonly resists?: ShipHintResists;
}

export interface ShipHintRenderer {
  render(model: ShipHintModel, container: HTMLElement): void;
}

export class ShipHintRendererImpl implements ShipHintRenderer {
  render(model: ShipHintModel, container: HTMLElement): void {
    const root = html`<div class="ship-hint"></div>` as unknown as HTMLElement;
    root.appendChild(renderHeader(model));
    for (const section of model.sections) {
      root.appendChild(renderRowsSection(section));
    }
    if (model.resists !== undefined) root.appendChild(renderResistsSection(model.resists));
    container.appendChild(root);
  }
}

function renderHeader(model: ShipHintModel): HTMLElement {
  return html`<div class="ship-hint-header">
    <span class="ship-hint-name">${model.name}</span>
    <span class="ship-hint-subtitle">${model.subtitle}</span>
  </div>` as unknown as HTMLElement;
}

function renderRowsSection(section: ShipHintSection): HTMLElement {
  const el = renderSectionShell(section.heading);
  for (const row of section.rows) {
    el.appendChild(html`<div class="ship-hint-row">
      <span class="ship-hint-label">${row.label}</span>
      <span class="ship-hint-value">${row.value}</span>
    </div>` as unknown as HTMLElement);
  }
  return el;
}

function renderResistsSection(resists: ShipHintResists): HTMLElement {
  const el = renderSectionShell(resists.heading);
  const grid = html`<div class="ship-hint-resists"></div>` as unknown as HTMLElement;
  grid.appendChild(html`<span class="ship-hint-resists-layer"></span>` as unknown as HTMLElement);
  for (const column of resists.columns) {
    grid.appendChild(html`<span class="ship-hint-resists-col">${column}</span>` as unknown as HTMLElement);
  }
  for (const row of resists.rows) {
    grid.appendChild(html`<span class="ship-hint-resists-layer">${row.layer}</span>` as unknown as HTMLElement);
    for (const value of row.values) {
      grid.appendChild(html`<span class="ship-hint-resists-value">${value}</span>` as unknown as HTMLElement);
    }
  }
  el.appendChild(grid);
  return el;
}

function renderSectionShell(heading: string): HTMLElement {
  return html`<div class="ship-hint-section">
    <div class="ship-hint-section-label">${heading}</div>
  </div>` as unknown as HTMLElement;
}
