import type { Side } from "../side";
import type { Popup } from "../popup";

export interface ModulesPopupEls {
  readonly fields: Record<Side, { readonly field: HTMLElement; readonly trigger: HTMLButtonElement; readonly popup: HTMLElement }>;
}

export interface ModulesPopup {
  popup(side: Side): Popup;
  registerOnClose(side: Side, fn: () => void): void;
  syncEnabled(): void;
}
