import { createPopup } from "./createPopup";
import type { Popup, PopupGroup } from "../popup";

export interface PopupFieldEls {
  readonly field: HTMLElement;
  readonly trigger: HTMLButtonElement;
  readonly popup: HTMLElement;
  readonly section?: HTMLElement;
  readonly summary?: HTMLElement;
}

export interface PopupFieldConfig {
  readonly els: PopupFieldEls;
  readonly popupGroup: PopupGroup;
  readonly onOpen?: () => void;
  readonly onClose?: () => void;
}

export class PopupField {
  private readonly els: PopupFieldEls;
  readonly popup: Popup;

  constructor(config: PopupFieldConfig) {
    this.els = config.els;
    this.popup = createPopup({
      popupEl: config.els.popup,
      triggerEl: config.els.trigger,
      fieldEl: config.els.field,
      isOpen: () => !config.els.popup.hidden,
      onOpen: config.onOpen,
      onClose: config.onClose,
    });
    config.popupGroup.register(this.popup);
    config.els.trigger.addEventListener("click", () => config.popupGroup.toggle(this.popup));
  }

  setEnabled(enabled: boolean, hint: string): void {
    this.els.trigger.disabled = !enabled;
    this.els.trigger.setAttribute("data-hint", hint);
  }

  applyLabel(text: string): void {
    const labelSpan = this.els.trigger.querySelector(".trigger-label");
    if (labelSpan) labelSpan.textContent = text;
    this.els.trigger.setAttribute("aria-label", text);
    this.els.popup.setAttribute("aria-label", text);
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

  clearSection(): HTMLElement | undefined {
    const section = this.els.section;
    if (!section) return undefined;
    section.innerHTML = "";
    return section;
  }

  syncEnabledFromSections(emptyHint: string): void {
    const sections = Array.from(this.els.popup.children).filter((c): c is HTMLElement => c instanceof HTMLElement && c.classList.contains("preview-section"));
    const hasContent = sections.some((s) => !s.hidden && s.children.length > 0);
    this.setEnabled(hasContent, hasContent ? "" : emptyHint);
  }
}
