import type { FittingImport, FittingRow, FittingSection, FittingSummary } from "../../../fitting";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import { html } from "../markup";
import { IconActionImpl, SectionBlockImpl, spriteIconStroked } from "../shared";

export interface FittingPreview {
  show(anchor: HTMLElement, summary: FittingSummary, shipImageUrl?: string, onClose?: () => void): void;
  hide(): void;
}

interface PreviewDependencies {
  readonly container: HTMLElement;
  readonly i18n: I18n;
  readonly imageCatalog: ImageCatalog;
  readonly fittingImport: FittingImport;
  readonly viewport: () => { readonly innerWidth: number; readonly innerHeight: number };
}

export class DomFittingPreview implements FittingPreview {
  private readonly container: HTMLElement;
  private readonly i18n: I18n;
  private readonly imageCatalog: ImageCatalog;
  private readonly fittingImport: FittingImport;
  private readonly viewport: () => { readonly innerWidth: number; readonly innerHeight: number };

  constructor({ container, i18n, imageCatalog, fittingImport, viewport }: PreviewDependencies) {
    this.container = container;
    this.i18n = i18n;
    this.imageCatalog = imageCatalog;
    this.fittingImport = fittingImport;
    this.viewport = viewport;
  }

  show(anchor: HTMLElement, summary: FittingSummary, shipImageUrl?: string, onClose?: () => void): void {
    this.container.innerHTML = "";
    this.container.appendChild(renderHeader(this.i18n, summary, shipImageUrl, onClose));
    for (const section of summary.sections) {
      this.container.appendChild(renderSection(this.i18n, this.imageCatalog, this.fittingImport, section));
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

function renderHeader(
  i18n: I18n,
  summary: FittingSummary,
  shipImageUrl: string | undefined,
  onClose: (() => void) | undefined,
): HTMLElement {
  const image = shipImageUrl
    ? html`<img class="hull-ship-image" alt="" src=${shipImageUrl}>` as unknown as HTMLImageElement
    : html`<img class="hull-ship-image" alt="" hidden>` as unknown as HTMLImageElement;

  const hull = html`<span class="preview-hull truncate">${summary.hullName}</span>`;
  const fitting = html`<span class="preview-fitting truncate">${summary.fittingName}</span>`;
  const titles = html`<div class="preview-titles">${hull}${fitting}</div>`;

  const closeAction = new IconActionImpl({
    buttonClass: "preview-close icon-button",
    iconSvg: spriteIconStroked("delete", 12),
    title: () => i18n.t("button.close"),
  });
  const close = closeAction.create(() => onClose?.());

  return html`<div class="preview-header">${image}${titles}${close}</div>` as unknown as HTMLElement;
}

function renderSection(i18n: I18n, imageCatalog: ImageCatalog, fittingImport: FittingImport, section: FittingSection): HTMLElement {
  const block = new SectionBlockImpl();
  const rows = section.rows.map((row) => renderRow(i18n, imageCatalog, fittingImport, row));
  return block.create(i18n.t(`fitting.section.${section.kind}`), rows);
}

function renderRow(
  i18n: I18n,
  imageCatalog: ImageCatalog,
  fittingImport: FittingImport,
  row: FittingRow,
): HTMLElement {
  const language = i18n.current();
  const displayName = row.id !== undefined ? fittingImport.itemNameForId(row.id, language) : row.name;
  const iconUrl = row.empty ? undefined : (row.id ? imageCatalog.itemIconUrl(row.id) : undefined);
  const chargeIconUrl = row.charge ? (row.chargeId ? imageCatalog.itemIconUrl(row.chargeId) : undefined) : undefined;
  const chargeName = row.charge ? (row.chargeId !== undefined ? fittingImport.itemNameForId(row.chargeId, language) : row.charge) : undefined;

  const chargeChildren = row.charge
    ? [html`<img class="preview-charge-icon" alt="" src=${chargeIconUrl}>` as unknown as HTMLImageElement,
       html`<span class="preview-charge">, ${chargeName}</span>`]
    : null;

  const name = html`<span class="preview-name truncate" title=${row.empty ? row.name : displayName}>${displayName}</span>`;
  const main = html`<div class="preview-row-main">${name}${chargeChildren}</div>`;

  const quantity = row.quantity !== undefined ? html`<span class="preview-quantity mono">x${row.quantity}</span>` : null;

  const icon = html`<img class="preview-icon" alt="" src=${iconUrl}>` as unknown as HTMLImageElement;
  const rowEl = html`<div class="preview-row">${icon}${main}${quantity}</div>` as unknown as HTMLElement;
  if (row.empty) rowEl.classList.add("preview-row-empty");
  return rowEl;
}

function positionPreview(
  container: HTMLElement,
  anchor: HTMLElement,
  viewport: { readonly innerWidth: number; readonly innerHeight: number },
): void {
  const anchorRect = anchor.getBoundingClientRect();
  const parent = container.offsetParent;
  const parentRect = parent?.getBoundingClientRect() ?? {
    left: 0, top: 0, width: viewport.innerWidth, height: viewport.innerHeight,
  };
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
