import { html } from "../markup";
import type { Popup, PopupGroup } from "../popup";
import { IconActionImpl } from "./iconAction";
import { SelectableListImpl, type SelectableListShape } from "./selectableList";
import { spriteIcon } from "./spriteIcon";

export interface ScriptOption {
  readonly value: string;
  readonly label: string;
  readonly hint?: string;
  readonly iconUrl?: string;
  readonly selected: boolean;
}

export interface ScriptGearOptions {
  readonly hint: string;
  readonly disabled?: boolean;
  readonly dataIndex?: number | string;
}

export interface ScriptSectionConfig<K> {
  readonly popupId: string;
  readonly mountEl: HTMLElement;
  readonly parentPopup: Popup;
  readonly popupGroup: PopupGroup;
  readonly listShape: SelectableListShape;
  readonly placement: "alongside-end" | "alongside-start";
  readonly options: (key: K) => readonly ScriptOption[];
  readonly onSelect: (key: K, value: string) => void;
  readonly gearHint: (key: K, value: string) => string;
  readonly heading?: (key: K) => string;
}

export class ScriptSection<K> {
  private readonly config: ScriptSectionConfig<K>;
  private readonly popupEl: HTMLElement;
  private readonly list: SelectableListImpl;
  private readonly gearAction: IconActionImpl;
  private currentKey: K | undefined;
  private currentGear: HTMLButtonElement | undefined;
  readonly popup: Popup;

  constructor(config: ScriptSectionConfig<K>) {
    this.config = config;
    this.list = new SelectableListImpl(config.listShape);
    this.gearAction = new IconActionImpl({
      buttonClass: "ewar-script-gear btn icon-button",
      iconSvg: spriteIcon("gear"),
      hint: "",
      ariaHaspopup: "menu",
      ariaExpanded: false,
    });
    const placementClass = config.placement === "alongside-end" ? "script-popup-alongside-end" : "script-popup-alongside-start";
    const classAttr = `ewar-script-popup popup ${placementClass}`;
    this.popupEl = html`<div id=${config.popupId} class=${classAttr} role="menu" hidden></div>` as unknown as HTMLElement;
    config.mountEl.appendChild(this.popupEl);
    this.popup = this.createPopup();
    config.popupGroup.register(this.popup, { parent: config.parentPopup });
  }

  createGear(key: K, options: ScriptGearOptions): HTMLButtonElement {
    const gear = this.gearAction.create(() => this.open(key, gear));
    if (options.dataIndex !== undefined) gear.setAttribute("data-index", String(options.dataIndex));
    gear.setAttribute("aria-controls", this.config.popupId);
    gear.setAttribute("data-hint", options.hint);
    gear.setAttribute("aria-label", options.hint);
    if (options.disabled) gear.setAttribute("disabled", "");
    return gear;
  }

  open(key: K, gear: HTMLButtonElement): void {
    this.currentKey = key;
    this.currentGear = gear;
    this.renderOptions(key);
    gear.setAttribute("aria-expanded", "true");
    this.config.popupGroup.open(this.popup);
  }

  close(): void {
    this.popup.close();
  }

  isOpen(): boolean {
    return this.popup.isOpen();
  }

  focusTrigger(): void {
    this.popup.focusTrigger();
  }

  private renderOptions(key: K): void {
    this.popupEl.innerHTML = "";
    const heading = this.config.heading?.(key);
    if (heading) {
      const labelId = `${this.config.popupId}-label`;
      const label = html`<div id=${labelId} class="ewar-script-popup-label">${heading}</div>`;
      this.popupEl.setAttribute("aria-labelledby", labelId);
      this.popupEl.appendChild(label as unknown as Node);
    } else {
      this.popupEl.removeAttribute("aria-labelledby");
    }
    const items = this.config.options(key);
    for (const item of items) {
      const button = this.list.createButton(item);
      button.addEventListener("click", () => this.onOptionSelected(key, item.value));
      this.popupEl.appendChild(button);
    }
  }

  private onOptionSelected(key: K, value: string): void {
    this.config.onSelect(key, value);
    if (this.currentGear) {
      const hint = this.config.gearHint(key, value);
      this.currentGear.setAttribute("data-hint", hint);
      this.currentGear.setAttribute("aria-label", hint);
    }
    this.config.popupGroup.close(this.popup);
    this.focusTrigger();
  }

  private createPopup(): Popup {
    return {
      isOpen: () => !this.popupEl.hidden,
      open: () => { this.popupEl.hidden = false; },
      close: () => {
        this.popupEl.hidden = true;
        if (this.currentGear) this.currentGear.setAttribute("aria-expanded", "false");
      },
      focusTrigger: () => this.currentGear?.focus(),
      contains: (target) => {
        if (!(target instanceof Element)) return false;
        return this.popupEl.contains(target) || (this.currentGear !== undefined && this.currentGear.contains(target));
      },
    };
  }
}
