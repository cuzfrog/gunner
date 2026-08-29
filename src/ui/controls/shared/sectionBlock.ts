import { html } from "../markup";

export interface SectionBlock {
  create(label: string, rows: readonly (Element | DocumentFragment)[]): HTMLElement;
}

export class SectionBlockImpl implements SectionBlock {
  create(label: string, rows: readonly (Element | DocumentFragment)[]): HTMLElement {
    const children: (Element | DocumentFragment)[] = [html`<div class="preview-section-label">${label}</div>`];
    for (const row of rows) children.push(row);
    return html`<div class="preview-section">${children}</div>` as unknown as HTMLElement;
  }
}
