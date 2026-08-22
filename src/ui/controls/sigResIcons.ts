import type { SigResolutionClass } from "../../sim";
import type { GunFamilies, ImportedTurret } from "../../fitting";
import type { ImageCatalog } from "../imageCatalog";
import { isHtmlButtonElement, isHtmlImageElement } from "../controlsDom";
import { isSigResClass } from "../controlsFormat";

export interface SigResIconEls {
  readonly sigResOptions: HTMLElement;
}

export class SigResIcons {
  private readonly gunFamilies: GunFamilies;
  private readonly imageCatalog: ImageCatalog;
  private readonly originalTitles: Partial<Record<SigResolutionClass, string>> = {};

  constructor(deps: { gunFamilies: GunFamilies; imageCatalog: ImageCatalog }) {
    this.gunFamilies = deps.gunFamilies;
    this.imageCatalog = deps.imageCatalog;
  }

  render(els: SigResIconEls, turret: ImportedTurret | undefined): void {
    for (const button of Array.from(els.sigResOptions.children)) {
      if (!isHtmlButtonElement(button)) continue;
      const value = button.getAttribute("data-value") ?? "";
      if (!isSigResClass(value)) continue;
      const img = this.iconFor(button);
      const original = this.originalTitle(value, button);
      if (turret) {
        const family = this.gunFamilies.familyOf(turret.moduleName);
        const representative = this.gunFamilies.representativeOf(family, value);
        const url = this.imageCatalog.itemIconUrl(representative);
        if (url) {
          img.src = url;
          img.hidden = false;
          button.title = `${representative} · ${original}`;
          continue;
        }
      }
      img.hidden = true;
      button.title = original;
    }
  }

  clear(els: SigResIconEls): void {
    for (const button of Array.from(els.sigResOptions.children)) {
      if (!isHtmlButtonElement(button)) continue;
      const value = button.getAttribute("data-value") ?? "";
      if (!isSigResClass(value)) continue;
      const img = this.iconFor(button);
      img.hidden = true;
      const original = this.originalTitles[value];
      if (original !== undefined) button.title = original;
    }
  }

  private iconFor(button: HTMLButtonElement): HTMLImageElement {
    for (const child of Array.from(button.children)) {
      if (isHtmlImageElement(child) && child.className === "sigres-icon") return child;
    }
    const img = document.createElement("img");
    img.className = "sigres-icon";
    img.alt = "";
    img.hidden = true;
    button.appendChild(img);
    return img;
  }

  private originalTitle(value: SigResolutionClass, button: HTMLButtonElement): string {
    let title = this.originalTitles[value];
    if (title === undefined) {
      title = button.title;
      this.originalTitles[value] = title;
    }
    return title;
  }
}
