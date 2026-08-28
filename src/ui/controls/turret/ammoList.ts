import type { CargoCharge, ChargeCatalog, FittingImport, ImportedTurret } from "../../../fitting";
import type { TypeId } from "../../../gamedata/ids";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import { chargeStatSuffix } from "../controlsFormat";
import { isHtmlButtonElement, setText } from "../controlsDom";

export interface AmmoListEls {
  readonly ammoTrigger: HTMLButtonElement;
  readonly ammoSummary: HTMLElement;
  readonly ammoSummaryIcon: HTMLImageElement;
  readonly ammoPopup: HTMLElement;
  readonly ammoCargoLabel: HTMLElement;
  readonly ammoCargoList: HTMLElement;
  readonly ammoExpand: HTMLButtonElement;
  readonly ammoAllSection: HTMLElement;
  readonly ammoAllList: HTMLElement;
}

export interface AmmoListState {
  readonly turret?: ImportedTurret;
  readonly ammo: TypeId;
  readonly cargo: readonly CargoCharge[];
  readonly allExpanded: boolean;
}

export class AmmoList {
  private readonly els: AmmoListEls;
  private readonly chargeCatalog: ChargeCatalog;
  private readonly imageCatalog: ImageCatalog;
  private readonly fittingImport: FittingImport;
  private readonly i18n: I18n;
  private readonly onSelect: (id: TypeId) => void;
  private readonly onExpand: () => void;

  constructor(deps: {
    els: AmmoListEls;
    chargeCatalog: ChargeCatalog;
    imageCatalog: ImageCatalog;
    fittingImport: FittingImport;
    i18n: I18n;
    onSelect: (id: TypeId) => void;
    onExpand: () => void;
  }) {
    this.els = deps.els;
    this.chargeCatalog = deps.chargeCatalog;
    this.imageCatalog = deps.imageCatalog;
    this.fittingImport = deps.fittingImport;
    this.i18n = deps.i18n;
    this.onSelect = deps.onSelect;
    this.onExpand = deps.onExpand;
    this.els.ammoExpand.addEventListener("click", () => this.onExpand());
  }

  setPopupOpen(open: boolean): void {
    this.els.ammoPopup.hidden = !open;
    this.els.ammoTrigger.setAttribute("aria-expanded", String(open));
  }

  focusSelectedOrFirst(): void {
    const selected =
      this.findButton(this.els.ammoCargoList, '[aria-selected="true"]') ??
      this.findButton(this.els.ammoAllList, '[aria-selected="true"]') ??
      this.els.ammoCargoList.firstElementChild;
    if (selected && isHtmlButtonElement(selected)) selected.focus();
  }

  render(state: AmmoListState): void {
    const hasTurret = state.turret !== undefined;
    this.els.ammoTrigger.disabled = !hasTurret;
    setText(this.els.ammoSummary, hasTurret ? this.fittingImport.itemNameForId(state.ammo, this.i18n.current()) : "—");
    this.renderIcon(state.ammo, hasTurret);
    this.renderCargoList(state);
    this.renderAllList(state);
    this.renderExpand(state.allExpanded);
  }

  private renderIcon(ammo: TypeId, hasTurret: boolean): void {
    const icon = this.els.ammoSummaryIcon;
    if (!hasTurret) {
      icon.hidden = true;
      return;
    }
    const url = this.imageCatalog.itemIconUrl(ammo);
    icon.src = url ?? "";
    icon.hidden = !url;
  }

  private renderCargoList(state: AmmoListState): void {
    const list = this.els.ammoCargoList;
    const label = this.els.ammoCargoLabel;
    list.innerHTML = "";
    if (!state.turret) {
      list.hidden = true;
      label.hidden = true;
      return;
    }
    const entries = this.cargoEntries(state);
    if (entries.length === 0) {
      list.hidden = true;
      label.hidden = true;
      return;
    }
    list.hidden = false;
    label.hidden = false;
    for (const entry of entries) {
      const item = this.createItem(entry.id, entry.id === state.ammo, this.i18n.t("button.selectAmmo"));
      if (entry.quantity !== undefined) {
        const quantity = document.createElement("span");
        quantity.className = "ammo-item-quantity mono";
        quantity.textContent = `x${entry.quantity}`;
        item.appendChild(quantity);
      }
      item.addEventListener("click", () => this.onSelect(entry.id));
      list.appendChild(item);
    }
  }

  private cargoEntries(state: AmmoListState): { id: TypeId; quantity?: number }[] {
    const loaded = state.ammo;
    const inCargo = state.cargo.some((c) => c.id === loaded);
    const entries: { id: TypeId; quantity?: number }[] = [];
    if (!inCargo) entries.push({ id: loaded });
    for (const charge of state.cargo) {
      entries.push({ id: charge.id, quantity: charge.quantity });
    }
    return entries;
  }

  private renderAllList(state: AmmoListState): void {
    const list = this.els.ammoAllList;
    const section = this.els.ammoAllSection;
    list.innerHTML = "";
    if (!state.turret) {
      list.hidden = true;
      section.hidden = true;
      return;
    }
    const options = this.chargeCatalog.chargesForTurret(state.turret);
    if (options.length === 0) {
      list.hidden = true;
      section.hidden = !state.allExpanded;
      return;
    }
    list.hidden = false;
    for (const option of options) {
      const item = this.createItem(option.id, option.id === state.ammo, chargeStatSuffix(option));
      item.addEventListener("click", () => this.onSelect(option.id));
      list.appendChild(item);
    }
    section.hidden = !state.allExpanded;
  }

  private createItem(id: TypeId, selected: boolean, title: string): HTMLButtonElement {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "ammo-item btn";
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", String(selected));
    item.title = title;
    const iconUrl = this.imageCatalog.itemIconUrl(id);
    if (iconUrl) {
      const icon = document.createElement("img");
      icon.className = "ammo-item-icon";
      icon.src = iconUrl;
      icon.alt = "";
      item.appendChild(icon);
    }
    const displayName = this.fittingImport.itemNameForId(id, this.i18n.current());
    const label = document.createElement("span");
    label.className = "ammo-item-name truncate";
    label.textContent = displayName;
    label.title = displayName;
    item.appendChild(label);
    return item;
  }

  private renderExpand(expanded: boolean): void {
    const key = expanded ? "ammo.hideAll" : "ammo.showAll";
    this.els.ammoExpand.setAttribute("data-i18n", key);
    setText(this.els.ammoExpand, this.i18n.t(key));
  }

  private findButton(list: HTMLElement, selector: string): Element | null {
    const found = list.querySelector(selector);
    return found && isHtmlButtonElement(found) ? found : null;
  }
}
