import type { TypeId } from "../../../gamedata/ids";
import { isHtmlButtonElement } from "../controlsDom";
import type { Popup } from "../popup";
import { SelectableListImpl, type SelectableListShape } from "./selectableList";

export interface VariantItem {
  readonly id: TypeId;
  readonly name: string;
  readonly iconUrl?: string;
}

export interface VariantSectionConfig {
  readonly gear: HTMLButtonElement;
  readonly popupEl: HTMLElement;
  readonly listShape: SelectableListShape;
  readonly variants: () => readonly VariantItem[];
  readonly currentId: () => TypeId | undefined;
  readonly onSelect: (id: TypeId) => void;
  readonly isEnabled: () => boolean;
}

export class VariantSection {
  private readonly gear: HTMLButtonElement;
  private readonly popupEl: HTMLElement;
  private readonly list: SelectableListImpl;
  private readonly variantsProvider: () => readonly VariantItem[];
  private readonly currentIdProvider: () => TypeId | undefined;
  private readonly selectHandler: (id: TypeId) => void;
  private readonly enabledProvider: () => boolean;
  private open = false;
  readonly popup: Popup;

  constructor(config: VariantSectionConfig) {
    this.gear = config.gear;
    this.popupEl = config.popupEl;
    this.list = new SelectableListImpl(config.listShape);
    this.variantsProvider = config.variants;
    this.currentIdProvider = config.currentId;
    this.selectHandler = config.onSelect;
    this.enabledProvider = config.isEnabled;
    this.popup = this.createPopup();
  }

  openPopup(): void {
    this.renderVariants();
    this.popupEl.hidden = false;
    this.gear.setAttribute("aria-expanded", "true");
    this.open = true;
    const active = Array.from(this.popupEl.children).find((child) => child.getAttribute("aria-current") === "true");
    const activeButton = active && isHtmlButtonElement(active) ? active : null;
    const firstChild = this.popupEl.firstElementChild;
    const firstButton = firstChild && isHtmlButtonElement(firstChild) ? firstChild : null;
    (activeButton ?? firstButton)?.focus();
  }

  closePopup(): void {
    this.popupEl.hidden = true;
    this.gear.setAttribute("aria-expanded", "false");
    this.open = false;
  }

  isOpen(): boolean {
    return this.open;
  }

  renderVariants(): void {
    const variants = this.variantsProvider();
    const currentId = this.currentIdProvider();
    const items = variants.map((variant) => ({
      value: variant.id,
      label: variant.name,
      title: variant.name,
      iconUrl: variant.iconUrl,
      selected: currentId === variant.id,
    }));
    const buttons = this.list.render(this.popupEl, items);
    for (let i = 0; i < variants.length; i++) {
      const id = variants[i].id;
      buttons[i].addEventListener("click", () => this.selectHandler(id));
    }
  }

  updateUI(): void {
    this.gear.disabled = !this.enabledProvider();
    this.renderVariants();
  }

  private createPopup(): Popup {
    return {
      isOpen: () => this.isOpen(),
      open: () => this.openPopup(),
      close: () => this.closePopup(),
      focusTrigger: () => this.gear.focus(),
      contains: (domTarget) => domTarget instanceof Element && (this.popupEl.contains(domTarget) || this.gear.contains(domTarget)),
    };
  }
}
