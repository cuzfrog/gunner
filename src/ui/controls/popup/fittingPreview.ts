import type { FittingImport, FittingRow, FittingSection, FittingSummary } from "../../../fitting";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
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
  const header = document.createElement("div");
  header.className = "preview-header";

  const image = document.createElement("img");
  image.className = "hull-ship-image";
  image.alt = "";
  if (shipImageUrl) image.src = shipImageUrl;
  else image.hidden = true;
  header.appendChild(image);

  const titles = document.createElement("div");
  titles.className = "preview-titles";

  const hull = document.createElement("span");
  hull.className = "preview-hull truncate";
  hull.textContent = summary.hullName;
  titles.appendChild(hull);

  const fitting = document.createElement("span");
  fitting.className = "preview-fitting truncate";
  fitting.textContent = summary.fittingName;
  titles.appendChild(fitting);

  header.appendChild(titles);

  const closeAction = new IconActionImpl({
    buttonClass: "preview-close icon-button",
    iconSvg: spriteIconStroked("delete", 12),
    title: () => i18n.t("button.close"),
  });
  const close = closeAction.create(() => onClose?.());
  header.appendChild(close);
  return header;
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
  const rowEl = document.createElement("div");
  rowEl.className = row.empty ? "preview-row preview-row-empty" : "preview-row";

  const iconUrl = row.empty ? undefined : (row.id ? imageCatalog.itemIconUrl(row.id) : undefined);
  const icon = document.createElement("img");
  icon.className = "preview-icon";
  icon.alt = "";
  if (iconUrl) icon.src = iconUrl;
  rowEl.appendChild(icon);

  const main = document.createElement("div");
  main.className = "preview-row-main";

  const language = i18n.current();
  const displayName = row.id !== undefined ? fittingImport.itemNameForId(row.id, language) : row.name;
  const name = document.createElement("span");
  name.className = "preview-name truncate";
  name.textContent = displayName;
  name.title = row.empty ? row.name : displayName;
  main.appendChild(name);

  if (row.charge) {
    const chargeIcon = document.createElement("img");
    chargeIcon.className = "preview-charge-icon";
    chargeIcon.alt = "";
    const chargeIconUrl = row.chargeId ? imageCatalog.itemIconUrl(row.chargeId) : undefined;
    if (chargeIconUrl) chargeIcon.src = chargeIconUrl;
    main.appendChild(chargeIcon);

    const charge = document.createElement("span");
    charge.className = "preview-charge";
    const chargeName = row.chargeId !== undefined ? fittingImport.itemNameForId(row.chargeId, language) : row.charge;
    charge.textContent = `, ${chargeName}`;
    main.appendChild(charge);
  }

  rowEl.appendChild(main);

  if (row.quantity !== undefined) {
    const quantity = document.createElement("span");
    quantity.className = "preview-quantity mono";
    quantity.textContent = `x${row.quantity}`;
    rowEl.appendChild(quantity);
  }

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
