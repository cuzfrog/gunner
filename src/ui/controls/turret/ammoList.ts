import type { CargoCharge, ChargeCatalog, FittingImport, ImportedTurret } from "../../../fitting";
import type { TypeId } from "../../../gamedata/ids";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import { chargeStatSuffix } from "../controlsFormat";
import { isHtmlButtonElement, setText } from "../controlsDom";
import { SelectableListImpl, type SelectableItem } from "../shared";

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
  private readonly itemList: SelectableListImpl;

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
    this.itemList = new SelectableListImpl({
      itemClass: "ammo-item btn",
      nameClass: "ammo-item-name",
      iconClass: "ammo-item-icon",
      quantityClass: "ammo-item-quantity mono",
      role: "option",
      wrapInListItem: true,
    });
    this.els.ammoExpand.addEventListener("click", () => this.onExpand());
  }

  setPopupOpen(open: boolean): void {
    this.els.ammoPopup.hidden = !open;
    this.els.ammoTrigger.setAttribute("aria-expanded", String(open));
  }

  focusSelectedOrFirst(): void {
    const selected =
      this.findSelectedButton(this.els.ammoCargoList) ??
      this.findSelectedButton(this.els.ammoAllList) ??
      this.els.ammoCargoList.firstElementChild?.firstElementChild;
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
    const items: SelectableItem[] = entries.map((entry) => ({
      value: entry.id,
      label: this.fittingImport.itemNameForId(entry.id, this.i18n.current()),
      title: this.i18n.t("button.selectAmmo"),
      iconUrl: this.imageCatalog.itemIconUrl(entry.id),
      selected: entry.id === state.ammo,
      quantity: entry.quantity !== undefined ? `x${entry.quantity}` : undefined,
    }));
    const buttons = this.itemList.render(list, items);
    for (let i = 0; i < entries.length; i++) {
      const id = entries[i].id;
      buttons[i].addEventListener("click", () => this.onSelect(id));
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
    const items: SelectableItem[] = options.map((option) => ({
      value: option.id,
      label: this.fittingImport.itemNameForId(option.id, this.i18n.current()),
      title: chargeStatSuffix(option),
      iconUrl: this.imageCatalog.itemIconUrl(option.id),
      selected: option.id === state.ammo,
    }));
    const buttons = this.itemList.render(list, items);
    for (let i = 0; i < options.length; i++) {
      const id = options[i].id;
      buttons[i].addEventListener("click", () => this.onSelect(id));
    }
    section.hidden = !state.allExpanded;
  }

  private renderExpand(expanded: boolean): void {
    const key = expanded ? "ammo.hideAll" : "ammo.showAll";
    this.els.ammoExpand.setAttribute("data-i18n", key);
    setText(this.els.ammoExpand, this.i18n.t(key));
  }

  private findSelectedButton(list: HTMLElement): Element | null {
    for (const child of list.children) {
      const button = child.firstElementChild;
      if (button && button.getAttribute("aria-current") === "true") return button;
    }
    return null;
  }
}
