import type { I18n } from "../../i18n";
import type { Popup, PopupGroup } from "../popup";

export interface ConfirmEls {
  readonly confirmPopup: HTMLElement;
  readonly confirmMessage: HTMLElement;
  readonly confirmOk: HTMLButtonElement;
  readonly confirmCancel: HTMLButtonElement;
}

export interface ConfirmController {
  confirm(key: string): Promise<boolean>;
}

interface ConfirmControllerDeps {
  readonly popupGroup: PopupGroup;
  readonly i18n: I18n;
  readonly els: ConfirmEls;
}

export class ConfirmControllerImpl implements ConfirmController {
  private readonly popupGroup: PopupGroup;
  private readonly i18n: I18n;
  private readonly els: ConfirmEls;
  private readonly popupValue: Popup;
  private open = false;
  private currentResolve?: (value: boolean) => void;
  private currentPromise?: Promise<boolean>;
  private returnFocus?: HTMLElement;

  constructor(deps: ConfirmControllerDeps) {
    this.popupGroup = deps.popupGroup;
    this.i18n = deps.i18n;
    this.els = deps.els;
    this.popupValue = {
      isOpen: () => this.open,
      open: () => this.openPopup(),
      close: () => this.closePopup(false),
      focusTrigger: () => { this.returnFocus?.focus(); },
      contains: (domTarget) => this.containsTarget(domTarget),
    };
    this.els.confirmOk.addEventListener("click", () => this.closePopup(true));
    this.els.confirmCancel.addEventListener("click", () => this.closePopup(false));
    this.popupGroup.register(this.popupValue);
  }

  get popup(): Popup { return this.popupValue; }

  confirm(key: string): Promise<boolean> {
    if (this.open && this.currentPromise) {
      this.els.confirmMessage.textContent = this.i18n.t(key);
      return this.currentPromise;
    }
    const active = this.els.confirmOk.ownerDocument?.activeElement;
    this.returnFocus = typeof HTMLElement !== "undefined" && active instanceof HTMLElement ? active : undefined;
    this.els.confirmMessage.textContent = this.i18n.t(key);
    this.els.confirmOk.textContent = this.i18n.t("button.confirm");
    this.els.confirmCancel.textContent = this.i18n.t("button.cancel");
    this.popupGroup.open(this.popupValue);
    let resolve: (value: boolean) => void;
    const promise = new Promise<boolean>((r) => { resolve = r; });
    this.currentResolve = resolve!;
    this.currentPromise = promise;
    return promise;
  }

  private openPopup(): void {
    this.els.confirmPopup.hidden = false;
    this.open = true;
    this.els.confirmOk.focus();
  }

  private closePopup(confirmed: boolean): void {
    if (!this.open) return;
    this.els.confirmPopup.hidden = true;
    this.open = false;
    this.currentResolve?.(confirmed);
    this.currentResolve = undefined;
    this.currentPromise = undefined;
  }

  private containsTarget(domTarget: EventTarget): boolean {
    if (!(domTarget instanceof Element)) return false;
    const popup = this.els.confirmPopup;
    if (popup.contains(domTarget)) return true;
    return domTarget === this.els.confirmOk || domTarget === this.els.confirmCancel;
  }
}
