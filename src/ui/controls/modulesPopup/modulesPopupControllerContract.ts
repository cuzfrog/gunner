import type { Side } from "../side";

export interface ModulesPopupEls {
  readonly fields: Record<Side, { readonly field: HTMLElement; readonly trigger: HTMLButtonElement; readonly popup: HTMLElement }>;
}

export interface ModulesPopup {
  registerOnClose(side: Side, fn: () => void): void;
  syncEnabled(): void;
}
