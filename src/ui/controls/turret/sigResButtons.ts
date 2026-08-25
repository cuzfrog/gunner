import type { SigResolutionClass } from "../../../sim";
import { isHtmlButtonElement } from "../controlsDom";

interface SigResButtonsEls {
  readonly sigResOptions: HTMLElement;
}

export class SigResButtons {
  private readonly els: SigResButtonsEls;

  constructor(deps: SigResButtonsEls) {
    this.els = deps;
  }

  set(value: SigResolutionClass): void {
    for (const button of Array.from(this.els.sigResOptions.children)) {
      if (!isHtmlButtonElement(button)) continue;
      const active = button.getAttribute("data-value") === value;
      button.setAttribute("aria-pressed", String(active));
    }
  }
}
