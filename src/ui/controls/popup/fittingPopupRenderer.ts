import type { FittingImport, ImportedFitting, PresetFittings } from "../../../fitting";
import type { I18n } from "../../i18n";
import type { SavedFitting, SavedFittings } from "../../../appstate";
import { isHtmlButtonElement } from "../controlsDom";
import { SelectableListImpl, IconActionImpl, spriteIconStroked } from "../shared";
import { html } from "../markup";
import type { FittingPopupEls } from "./fittingPopupEls";
import type { FittingPreviewManager } from "./fittingPreviewManager";
import type { Side } from "../side";
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
  private readonly fittingList: SelectableListImpl;
  private readonly deleteAction: IconActionImpl;
  private readonly eyeAction: IconActionImpl;

  constructor(deps: FittingPopupRendererDeps) {
    this.side = deps.side;
    this.savedFittings = deps.savedFittings;
    this.presetFittings = deps.presetFittings;
    this.fittingImport = deps.fittingImport;
    this.i18n = deps.i18n;
    this.els = deps.els;
    this.panel = deps.panel;
    this.previews = deps.previews;
    this.fittingList = new SelectableListImpl({
      itemClass: "fitting-item",
      nameClass: "fitting-item-name",
    });
    this.deleteAction = new IconActionImpl({
      buttonClass: "fitting-delete icon-button",
      iconSvg: spriteIconStroked("delete", 12),
      title: () => this.i18n.t("button.deleteFitting"),
    });
    this.eyeAction = new IconActionImpl({
      buttonClass: "fitting-item-eye icon-button",
      iconSvg: spriteIconStroked("eye", 14),
      title: () => this.i18n.t("button.fittingDetails"),
      ariaPressed: false,
    });
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
    const currentKey = currentText !== undefined ? this.fittingImport.canonicalEftText(currentText) ?? currentText : undefined;

    if (!panel.profile) {
      savedLabel.hidden = true;
      presetLabel.hidden = true;
      empty.hidden = true;
      return;
    }

    const conditions = panel.skillConditions();
    const saved = this.savedFittings.listForHull(panel.profile.id);
    savedLabel.hidden = saved.length === 0;
    for (const fitting of saved) {
      const onFittingClick = () => actions.onItemClick(fitting.text);
      const item = this.createFittingItem(fitting.name, fitting.text, currentKey, onFittingClick);
      const imported = this.fittingImport.importFitting(fitting.text, conditions);
      if (!imported) {
        item.classList.toggle("is-invalid", true);
        const invalidText = this.i18n.t("fitting.invalid");
        item.title = invalidText;
        item.disabled = true;
        item.setAttribute("aria-disabled", "true");
      }
      const entry = this.createFittingEntry(fitting.text, item, () => actions.onDelete(fitting));
      savedList.appendChild(entry);
    }

    const presets = this.presetFittings.fittingsFor(panel.profile.id);
    presetLabel.hidden = presets.length === 0;
    for (const fit of presets) {
      const text = this.presetFittings.eftText(panel.profile.id, fit);
      const onFittingClick = () => actions.onItemClick(text);
      const item = this.createFittingItem(fit.name, text, currentKey, onFittingClick);
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

  private createFittingItem(name: string, text: string, currentKey: string | undefined, onClick: () => void): HTMLButtonElement {
    const selected = currentKey !== undefined && (text === currentKey || this.fittingImport.canonicalEftText(text) === currentKey);
    const button = this.fittingList.createButton({
      value: text,
      label: name,
      selected,
    });
    button.addEventListener("click", onClick);
    return button;
  }

  private createFittingEntry(text: string, item: HTMLButtonElement, onDelete?: () => void): HTMLElement {
    const eye = this.eyeAction.create(() => this.previews.showInMenu(this.side, text, eye, eye));
    const children: (Element | DocumentFragment)[] = [item, eye];
    if (onDelete) {
      const del = this.deleteAction.create(() => onDelete());
      children.push(del);
    }
    return html`<li class="fitting-entry" role="presentation">${children}</li>` as unknown as HTMLElement;
  }
}
