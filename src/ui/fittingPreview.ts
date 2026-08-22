import type { FittingRow, FittingSection, FittingSummary } from "../fitting";
import type { I18n } from "./i18n";
import type { ImageCatalog } from "./imageCatalog";

export interface FittingPreview {
  show(anchor: HTMLElement, summary: FittingSummary, shipImageUrl?: string): void;
  hide(): void;
}

interface PreviewDependencies {
  readonly container: HTMLElement;
  readonly i18n: I18n;
  readonly imageCatalog: ImageCatalog;
  readonly viewport: () => { readonly innerWidth: number; readonly innerHeight: number };
}

export class DomFittingPreview implements FittingPreview {
  private readonly container: HTMLElement;
  private readonly i18n: I18n;
  private readonly imageCatalog: ImageCatalog;
  private readonly viewport: () => { readonly innerWidth: number; readonly innerHeight: number };

  constructor({ container, i18n, imageCatalog, viewport }: PreviewDependencies) {
    this.container = container;
    this.i18n = i18n;
    this.imageCatalog = imageCatalog;
    this.viewport = viewport;
  }

  show(anchor: HTMLElement, summary: FittingSummary, shipImageUrl?: string): void {
    this.container.innerHTML = "";
    this.container.appendChild(renderHeader(summary, shipImageUrl));
    for (const section of summary.sections) {
      this.container.appendChild(renderSection(this.i18n, this.imageCatalog, section));
    }
    this.container.hidden = false;
    this.container.setAttribute("aria-hidden", "false");
    positionPreview(this.container, anchor, this.viewport());
  }

  hide(): void {
    this.container.hidden = true;
    this.container.setAttribute("aria-hidden", "true");
    this.container.innerHTML = "";
  }
}

function renderHeader(summary: FittingSummary, shipImageUrl?: string): HTMLElement {
  const header = document.createElement("div");
  header.className = "preview-header";

  const image = document.createElement("img");
  image.className = "ship-image";
  image.alt = "";
  if (shipImageUrl) image.src = shipImageUrl;
  else image.hidden = true;
  header.appendChild(image);

  const titles = document.createElement("div");
  titles.className = "preview-titles";

  const hull = document.createElement("span");
  hull.className = "preview-hull";
  hull.textContent = summary.hullName;
  titles.appendChild(hull);

  const fitting = document.createElement("span");
  fitting.className = "preview-fitting";
  fitting.textContent = summary.fittingName;
  titles.appendChild(fitting);

  header.appendChild(titles);
  return header;
}

function renderSection(i18n: I18n, imageCatalog: ImageCatalog, section: FittingSection): HTMLElement {
  const container = document.createElement("div");
  container.className = "preview-section";

  const label = document.createElement("div");
  label.className = "preview-section-label";
  label.textContent = i18n.t(`fitting.section.${section.kind}`);
  container.appendChild(label);

  for (const row of section.rows) {
    container.appendChild(renderRow(imageCatalog, row));
  }
  return container;
}

function renderRow(imageCatalog: ImageCatalog, row: FittingRow): HTMLElement {
  const rowEl = document.createElement("div");
  rowEl.className = "preview-row";

  const iconUrl = imageCatalog.itemIconUrl(row.name);
  const icon = document.createElement("img");
  icon.className = "preview-icon";
  icon.alt = "";
  if (iconUrl) icon.src = iconUrl;
  rowEl.appendChild(icon);

  const main = document.createElement("div");
  main.className = "preview-row-main";

  const name = document.createElement("span");
  name.className = "preview-name";
  name.textContent = row.name;
  main.appendChild(name);

  if (row.charge) {
    const charge = document.createElement("span");
    charge.className = "preview-charge";
    charge.textContent = `, ${row.charge}`;
    main.appendChild(charge);
  }

  rowEl.appendChild(main);

  if (row.quantity !== undefined) {
    const quantity = document.createElement("span");
    quantity.className = "preview-quantity";
    quantity.textContent = `x${row.quantity}`;
    rowEl.appendChild(quantity);
  }

  return rowEl;
}

function positionPreview(container: HTMLElement, anchor: HTMLElement, viewport: { readonly innerWidth: number; readonly innerHeight: number }): void {
  const anchorRect = anchor.getBoundingClientRect();
  const parent = container.offsetParent;
  const parentRect = parent?.getBoundingClientRect() ?? { left: 0, top: 0, width: viewport.innerWidth, height: viewport.innerHeight };
  const margin = 8;
  const gap = 8;

  const width = container.offsetWidth;
  const height = container.offsetHeight;
  const viewportCenter = viewport.innerWidth / 2;
  const anchorCenter = anchorRect.left + anchorRect.width / 2;

  let left: number;
  if (anchorCenter < viewportCenter) {
    left = anchorRect.right - parentRect.left + gap;
  } else {
    left = anchorRect.left - parentRect.left - width - gap;
  }

  let top = anchorRect.top - parentRect.top;

  const minLeft = margin - parentRect.left;
  const maxLeft = viewport.innerWidth - parentRect.left - width - margin;
  left = Math.max(minLeft, Math.min(left, maxLeft));

  const minTop = margin - parentRect.top;
  const maxTop = viewport.innerHeight - parentRect.top - height - margin;
  top = Math.max(minTop, Math.min(top, maxTop));

  container.style.left = `${left}px`;
  container.style.top = `${top}px`;
}
