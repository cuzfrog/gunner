import type { CargoCharge, ChargeCatalog, FittingImport, ImportedTurret } from "../../../fitting";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import { chargeStatSuffix } from "../controlsFormat";
import { isHtmlButtonElement, setText } from "../controlsDom";

export interface AmmoListEls {
  readonly attackerAmmoTrigger: HTMLButtonElement;
  readonly attackerAmmoSummary: HTMLElement;
  readonly attackerAmmoSummaryIcon: HTMLImageElement;
  readonly attackerAmmoPopup: HTMLElement;
  readonly attackerAmmoCargoLabel: HTMLElement;
  readonly attackerAmmoCargoList: HTMLElement;
  readonly attackerAmmoExpand: HTMLButtonElement;
  readonly attackerAmmoAllSection: HTMLElement;
  readonly attackerAmmoAllList: HTMLElement;
}

export interface AmmoListState {
  readonly turret?: ImportedTurret;
  readonly ammo: string;
  readonly cargo: readonly CargoCharge[];
  readonly allExpanded: boolean;
}

export class AmmoList {
  private readonly els: AmmoListEls;
  private readonly chargeCatalog: ChargeCatalog;
  private readonly imageCatalog: ImageCatalog;
  private readonly fittingImport: FittingImport;
  private readonly i18n: I18n;
  private readonly onSelect: (name: string) => void;
  private readonly onExpand: () => void;

  constructor(deps: {
    els: AmmoListEls;
    chargeCatalog: ChargeCatalog;
    imageCatalog: ImageCatalog;
    fittingImport: FittingImport;
    i18n: I18n;
    onSelect: (name: string) => void;
    onExpand: () => void;
  }) {
    this.els = deps.els;
    this.chargeCatalog = deps.chargeCatalog;
    this.imageCatalog = deps.imageCatalog;
    this.fittingImport = deps.fittingImport;
    this.i18n = deps.i18n;
    this.onSelect = deps.onSelect;
    this.onExpand = deps.onExpand;
    this.els.attackerAmmoExpand.addEventListener("click", () => this.onExpand());
  }

  setPopupOpen(open: boolean): void {
    this.els.attackerAmmoPopup.hidden = !open;
    this.els.attackerAmmoTrigger.setAttribute("aria-expanded", String(open));
  }

  focusSelectedOrFirst(): void {
    const selected =
      this.findButton(this.els.attackerAmmoCargoList, '[aria-selected="true"]') ??
      this.findButton(this.els.attackerAmmoAllList, '[aria-selected="true"]') ??
      this.els.attackerAmmoCargoList.firstElementChild;
    if (selected && isHtmlButtonElement(selected)) selected.focus();
  }

  render(state: AmmoListState): void {
    const hasTurret = state.turret !== undefined;
    this.els.attackerAmmoTrigger.disabled = !hasTurret;
    setText(this.els.attackerAmmoSummary, hasTurret ? this.fittingImport.itemName(state.ammo, this.i18n.current()) : "—");
    this.renderIcon(state.ammo, hasTurret);
    this.renderCargoList(state);
    this.renderAllList(state);
    this.renderExpand(state.allExpanded);
  }

  private renderIcon(ammo: string, hasTurret: boolean): void {
    const icon = this.els.attackerAmmoSummaryIcon;
    if (!hasTurret) {
      icon.hidden = true;
      return;
    }
    const url = this.imageCatalog.itemIconUrl(ammo);
    icon.src = url ?? "";
    icon.hidden = !url;
  }

  private renderCargoList(state: AmmoListState): void {
    const list = this.els.attackerAmmoCargoList;
    const label = this.els.attackerAmmoCargoLabel;
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
      const item = this.createItem(entry.name, entry.name === state.ammo, this.i18n.t("button.selectAmmo"));
      if (entry.quantity !== undefined) {
        const quantity = document.createElement("span");
        quantity.className = "ammo-item-quantity mono";
        quantity.textContent = `x${entry.quantity}`;
        item.appendChild(quantity);
      }
      item.addEventListener("click", () => this.onSelect(entry.name));
      list.appendChild(item);
    }
  }

  private cargoEntries(state: AmmoListState): { name: string; quantity?: number }[] {
    const loaded = state.ammo;
    const inCargo = state.cargo.some((c) => c.name === loaded);
    const entries: { name: string; quantity?: number }[] = [];
    if (!inCargo) entries.push({ name: loaded });
    for (const charge of state.cargo) {
      entries.push({ name: charge.name, quantity: charge.quantity });
    }
    return entries;
  }

  private renderAllList(state: AmmoListState): void {
    const list = this.els.attackerAmmoAllList;
    const section = this.els.attackerAmmoAllSection;
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
      const item = this.createItem(option.name, option.name === state.ammo, chargeStatSuffix(option));
      item.addEventListener("click", () => this.onSelect(option.name));
      list.appendChild(item);
    }
    section.hidden = !state.allExpanded;
  }

  private createItem(name: string, selected: boolean, title: string): HTMLButtonElement {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "ammo-item btn";
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", String(selected));
    item.title = title;
    const iconUrl = this.imageCatalog.itemIconUrl(name);
    if (iconUrl) {
      const icon = document.createElement("img");
      icon.className = "ammo-item-icon";
      icon.src = iconUrl;
      icon.alt = "";
      item.appendChild(icon);
    }
    const displayName = this.fittingImport.itemName(name, this.i18n.current());
    const label = document.createElement("span");
    label.className = "ammo-item-name truncate";
    label.textContent = displayName;
    label.title = displayName;
    item.appendChild(label);
    return item;
  }

  private renderExpand(expanded: boolean): void {
    const key = expanded ? "ammo.hideAll" : "ammo.showAll";
    this.els.attackerAmmoExpand.setAttribute("data-i18n", key);
    setText(this.els.attackerAmmoExpand, this.i18n.t(key));
  }

  private findButton(list: HTMLElement, selector: string): Element | null {
    const found = list.querySelector(selector);
    return found && isHtmlButtonElement(found) ? found : null;
  }
}
