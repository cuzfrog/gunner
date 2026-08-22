import type { FittingImport, ImportedFitting, PresetFitting, PresetFittings } from "../../fitting";
import type { SavedFitting, SavedFittings } from "../savedFittings";
import type { I18n } from "../i18n";
import type { ImageCatalog } from "../imageCatalog";
import { PopupGroup, type Popup } from "./popupGroup";
import { fittingAreaSelector, isHtmlButtonElement } from "./controlsDom";
import type { FittingPreviewManager } from "./fittingPreviewManager";
import type { Side, SidePanel } from "./sidePanel";

export interface FittingPopupEls {
  readonly trigger: HTMLButtonElement;
  readonly eye: HTMLButtonElement;
  readonly popup: HTMLElement;
  readonly savedList: HTMLElement;
  readonly presetList: HTMLElement;
  readonly savedLabel: HTMLElement;
  readonly presetLabel: HTMLElement;
  readonly empty: HTMLElement;
  readonly shipImage: HTMLImageElement;
}

export class FittingPopupController {
  private readonly side: Side;
  private readonly popupGroup: PopupGroup;
  private readonly savedFittings: SavedFittings;
  private readonly presetFittings: PresetFittings;
  private readonly fittingImport: FittingImport;
  private readonly imageCatalog: ImageCatalog;
  private readonly i18n: I18n;
  private readonly els: FittingPopupEls;
  private readonly panelFor: (side: Side) => SidePanel;
  private readonly applyFitting: (text: string) => ImportedFitting | undefined;
  private readonly previews: FittingPreviewManager;
  private readonly popupValue: Popup;
  private open = false;

  constructor(deps: {
    side: Side;
    popupGroup: PopupGroup;
    savedFittings: SavedFittings;
    presetFittings: PresetFittings;
    fittingImport: FittingImport;
    imageCatalog: ImageCatalog;
    i18n: I18n;
    els: FittingPopupEls;
    panelFor: (side: Side) => SidePanel;
    applyFitting: (text: string) => ImportedFitting | undefined;
    previews: FittingPreviewManager;
  }) {
    this.side = deps.side;
    this.popupGroup = deps.popupGroup;
    this.savedFittings = deps.savedFittings;
    this.presetFittings = deps.presetFittings;
    this.fittingImport = deps.fittingImport;
    this.imageCatalog = deps.imageCatalog;
    this.i18n = deps.i18n;
    this.els = deps.els;
    this.panelFor = deps.panelFor;
    this.applyFitting = deps.applyFitting;
    this.previews = deps.previews;
    this.popupValue = {
      isOpen: () => this.open,
      open: () => this.openPopup(),
      close: () => this.closePopup(),
      focusTrigger: () => this.els.trigger.focus(),
      contains: (target) => target instanceof Element && target.closest(fittingAreaSelector(this.side)) !== null,
    };
  }

  get popup(): Popup {
    return this.popupValue;
  }

  renderIfOpen(): void {
    if (this.open) this.render();
  }

  closeIfOpen(): void {
    if (this.open) this.closePopup();
  }

  private openPopup(): void {
    this.render();
    this.els.popup.hidden = false;
    this.els.trigger.setAttribute("aria-expanded", "true");
    this.open = true;
    const current = this.findFittingItem((item) => item.getAttribute("aria-current") === "true");
    const first = current ?? this.findFittingItem((item) => !item.disabled);
    first?.focus();
  }

  private closePopup(): void {
    this.els.popup.hidden = true;
    this.els.trigger.setAttribute("aria-expanded", "false");
    this.open = false;
    if (this.previews.openSide() === this.side && this.previews.isMenuPreview()) this.previews.hide(this.side);
  }

  private findFittingItem(predicate: (item: HTMLButtonElement) => boolean): HTMLButtonElement | undefined {
    for (const list of [this.els.savedList, this.els.presetList]) {
      for (const entry of list.children) {
        const item = entry.children[0];
        if (!isHtmlButtonElement(item)) continue;
        if (predicate(item)) return item;
      }
    }
    return undefined;
  }

  private render(): void {
    const panel = this.panelFor(this.side);
    const savedList = this.els.savedList;
    const presetList = this.els.presetList;
    const savedLabel = this.els.savedLabel;
    const presetLabel = this.els.presetLabel;
    const empty = this.els.empty;
    savedList.innerHTML = "";
    presetList.innerHTML = "";
    const currentText = panel.fittingText;

    if (!panel.profile) {
      savedLabel.hidden = true;
      presetLabel.hidden = true;
      empty.hidden = true;
      return;
    }

    const conditions = panel.skillConditions();
    const saved = this.savedFittings.listForHull(panel.profile.name);
    savedLabel.hidden = saved.length === 0;
    for (const fitting of saved) {
      const onFittingClick = () => this.onFittingItemClick(fitting.text);
      const item = this.createFittingItem(fitting.name, fitting.text, currentText, onFittingClick);
      const imported = this.fittingImport.importFitting(fitting.text, conditions);
      if (!imported) {
        item.classList.toggle("invalid", true);
        const invalidText = this.i18n.t("fitting.invalid");
        item.title = invalidText;
        item.disabled = true;
        item.setAttribute("aria-disabled", "true");
      }
      const entry = this.createFittingEntry(fitting.text, item, () => {
        this.savedFittings.remove(fitting.id);
        this.renderIfOpen();
        const next = this.findFittingItem((it) => !it.disabled) ?? this.els.trigger;
        next.focus();
      });
      savedList.appendChild(entry);
    }

    const presets = this.presetFittings.fittingsFor(panel.profile.name);
    presetLabel.hidden = presets.length === 0;
    for (const fit of presets) {
      const text = this.presetFittings.eftText(panel.profile.name, fit);
      const onFittingClick = () => this.onFittingItemClick(text);
      const item = this.createFittingItem(fit.name, text, currentText, onFittingClick);
      presetList.appendChild(this.createFittingEntry(text, item, undefined));
    }

    empty.hidden = saved.length > 0 || presets.length > 0;
  }

  private createFittingItem(
    name: string,
    text: string,
    currentText: string | undefined,
    onClick: () => void,
    iconUrl?: string,
  ): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "fitting-item";
    button.setAttribute("role", "menuitem");
    if (currentText === text) button.setAttribute("aria-current", "true");
    if (iconUrl) {
      const icon = document.createElement("img");
      icon.className = "propulsion-icon";
      icon.src = iconUrl;
      icon.alt = "";
      button.appendChild(icon);
    }
    const span = document.createElement("span");
    span.className = "fitting-item-name";
    span.textContent = name;
    span.title = name;
    button.appendChild(span);
    button.addEventListener("click", onClick);
    return button;
  }

  private createFittingEntry(
    text: string,
    item: HTMLButtonElement,
    onDelete: (() => void) | undefined,
  ): HTMLElement {
    const li = document.createElement("li");
    li.className = "fitting-entry";
    li.setAttribute("role", "presentation");
    li.appendChild(item);
    li.appendChild(this.createFittingItemEye(text));
    if (onDelete) {
      const del = document.createElement("button");
      del.type = "button";
      del.className = "fitting-delete";
      del.setAttribute("title", this.i18n.t("button.deleteFitting"));
      del.setAttribute("aria-label", this.i18n.t("button.deleteFitting"));
      del.innerHTML = DELETE_ICON_SVG;
      del.addEventListener("click", () => onDelete());
      li.appendChild(del);
    }
    return li;
  }

  private createFittingItemEye(text: string): HTMLButtonElement {
    const eye = document.createElement("button");
    eye.type = "button";
    eye.className = "fitting-item-eye";
    eye.setAttribute("aria-pressed", "false");
    eye.setAttribute("title", this.i18n.t("button.fittingDetails"));
    eye.setAttribute("aria-label", this.i18n.t("button.fittingDetails"));
    eye.innerHTML = EYE_ICON_SVG;
    eye.addEventListener("click", () => this.previews.showInMenu(this.side, text, eye, eye));
    return eye;
  }

  private onFittingItemClick(text: string): void {
    const imported = this.applyFitting(text);
    this.popupGroup.close(this.popup);
    this.popup.focusTrigger();
    if (imported && this.previews.openSide() === this.side && !this.previews.isMenuPreview()) this.previews.refresh();
  }
}

const DELETE_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" ' +
  'aria-hidden="true"><use href="icons.svg#delete"></use></svg>';

const EYE_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" ' +
  'aria-hidden="true"><use href="icons.svg#eye"></use></svg>';
