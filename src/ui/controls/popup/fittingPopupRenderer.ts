import type { FittingImport, ImportedFitting, PresetFittings } from "../../../fitting";
import type { I18n } from "../../i18n";
import type { SavedFitting, SavedFittings } from "../../../appstate";
import { isHtmlButtonElement } from "../controlsDom";
import type { FittingPopupEls } from "./fittingPopupEls";
import type { FittingPreviewManager } from "./fittingPreviewManager";
import type { Side } from "..";
import type { FittingPopupHost } from "./fittingPopupHost";

interface FittingPopupRendererDeps {
  readonly side: Side;
  readonly savedFittings: SavedFittings;
  readonly presetFittings: PresetFittings;
  readonly fittingImport: FittingImport;
  readonly i18n: I18n;
  readonly els: FittingPopupEls;
  readonly panel: FittingPopupHost;
  readonly previews: FittingPreviewManager;
}

interface FittingPopupRenderActions {
  readonly onItemClick: (text: string) => void;
  readonly onDelete: (saved: SavedFitting) => void;
}

export class FittingPopupRenderer {
  private readonly side: Side;
  private readonly savedFittings: SavedFittings;
  private readonly presetFittings: PresetFittings;
  private readonly fittingImport: FittingImport;
  private readonly i18n: I18n;
  private readonly els: FittingPopupEls;
  private readonly panel: FittingPopupHost;
  private readonly previews: FittingPreviewManager;

  constructor(deps: FittingPopupRendererDeps) {
    this.side = deps.side;
    this.savedFittings = deps.savedFittings;
    this.presetFittings = deps.presetFittings;
    this.fittingImport = deps.fittingImport;
    this.i18n = deps.i18n;
    this.els = deps.els;
    this.panel = deps.panel;
    this.previews = deps.previews;
  }

  get fittingEls(): FittingPopupEls { return this.els; }

  render(actions: FittingPopupRenderActions): void {
    const panel = this.panel;
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
      const onFittingClick = () => actions.onItemClick(fitting.text);
      const item = this.createFittingItem(fitting.name, fitting.text, currentText, onFittingClick);
      const imported = this.fittingImport.importFitting(fitting.text, conditions);
      if (!imported) {
        item.classList.toggle("invalid", true);
        const invalidText = this.i18n.t("fitting.invalid");
        item.title = invalidText;
        item.disabled = true;
        item.setAttribute("aria-disabled", "true");
      }
      const entry = this.createFittingEntry(fitting.text, item, () => actions.onDelete(fitting));
      savedList.appendChild(entry);
    }

    const presets = this.presetFittings.fittingsFor(panel.profile.name);
    presetLabel.hidden = presets.length === 0;
    for (const fit of presets) {
      const text = this.presetFittings.eftText(panel.profile.name, fit);
      const onFittingClick = () => actions.onItemClick(text);
      const item = this.createFittingItem(fit.name, text, currentText, onFittingClick);
      presetList.appendChild(this.createFittingEntry(text, item, undefined));
    }

    empty.hidden = saved.length > 0 || presets.length > 0;
  }

  findFittingItem(predicate: (item: HTMLButtonElement) => boolean): HTMLButtonElement | undefined {
    for (const list of [this.els.savedList, this.els.presetList]) {
      for (const entry of list.children) {
        const item = entry.children[0];
        if (!isHtmlButtonElement(item)) continue;
        if (predicate(item)) return item;
      }
    }
    return undefined;
  }

  private createFittingItem(name: string, text: string, currentText: string | undefined, onClick: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "fitting-item";
    button.setAttribute("role", "menuitem");
    if (currentText === text) button.setAttribute("aria-current", "true");
    const span = document.createElement("span");
    span.className = "fitting-item-name";
    span.textContent = name;
    span.title = name;
    button.appendChild(span);
    button.addEventListener("click", onClick);
    return button;
  }

  private createFittingEntry(text: string, item: HTMLButtonElement, onDelete?: () => void): HTMLElement {
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
}

const DELETE_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" ' +
  'aria-hidden="true"><use href="icons.svg#delete"></use></svg>';

const EYE_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" ' +
  'aria-hidden="true"><use href="icons.svg#eye"></use></svg>';
