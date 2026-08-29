import type { Popup } from "../popup";

export interface PopupConfig {
  readonly popupEl: HTMLElement;
  readonly triggerEl: HTMLButtonElement;
  readonly fieldEl: HTMLElement;
  readonly onOpen?: () => void;
  readonly onClose?: () => void;
  readonly isOpen: () => boolean;
}

export function createPopup(config: PopupConfig): Popup {
  return {
    open: () => {
      config.popupEl.hidden = false;
      config.triggerEl.setAttribute("aria-expanded", "true");
      config.onOpen?.();
    },
    close: () => {
      config.popupEl.hidden = true;
      config.triggerEl.setAttribute("aria-expanded", "false");
      config.onClose?.();
    },
    isOpen: () => config.isOpen(),
    focusTrigger: () => config.triggerEl.focus(),
    contains: (domTarget: EventTarget) => domTarget instanceof Element && config.fieldEl.contains(domTarget),
  };
}
