import { type SigResolutionClass, type SimValueParser } from "../../../sim";
import type { FittingImport, GunFamilies, ImportedTurret } from "../../../fitting";
import type { ImageCatalog } from "../../icons";
import type { I18n } from "../../i18n";
import { isHtmlButtonElement, isHtmlImageElement } from "../controlsDom";
import { html } from "../markup";

export interface SigResIconEls {
  readonly sigResOptions: HTMLElement;
}

export class SigResIcons {
  private readonly gunFamilies: GunFamilies;
  private readonly imageCatalog: ImageCatalog;
  private readonly i18n: I18n;
  private readonly fittingImport: FittingImport;
  private readonly simValueParser: SimValueParser;
  private readonly originalTitles: Partial<Record<SigResolutionClass, string>> = {};

  constructor(deps: { gunFamilies: GunFamilies; imageCatalog: ImageCatalog; i18n: I18n; fittingImport: FittingImport; simValueParser: SimValueParser }) {
    this.gunFamilies = deps.gunFamilies;
    this.imageCatalog = deps.imageCatalog;
    this.i18n = deps.i18n;
    this.fittingImport = deps.fittingImport;
    this.simValueParser = deps.simValueParser;
  }

  render(els: SigResIconEls, turret: ImportedTurret | undefined): void {
    for (const button of Array.from(els.sigResOptions.children)) {
      if (!isHtmlButtonElement(button)) continue;
      const sigRes = this.simValueParser.parseSigResolutionClass(button.getAttribute("data-value") ?? "");
      if (sigRes === undefined) continue;
      const img = this.iconFor(button);
      const original = this.originalTitle(sigRes, button);
      if (turret) {
        const family = this.gunFamilies.familyOf(turret.moduleId);
        const representative = this.gunFamilies.representativeOf(family, sigRes);
        const url = this.imageCatalog.itemIconUrl(representative);
        if (url) {
          img.src = url;
          img.hidden = false;
          const name = this.fittingImport.itemNameForId(representative, this.i18n.current());
          button.title = `${name} · ${original}`;
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
      const sigRes = this.simValueParser.parseSigResolutionClass(button.getAttribute("data-value") ?? "");
      if (sigRes === undefined) continue;
      const img = this.iconFor(button);
      img.hidden = true;
      const original = this.originalTitles[sigRes];
      if (original !== undefined) button.title = original;
    }
  }

  private iconFor(button: HTMLButtonElement): HTMLImageElement {
    for (const child of Array.from(button.children)) {
      if (isHtmlImageElement(child) && child.className === "choice-icon") return child;
    }
    const img = html`<img class="choice-icon" alt="" hidden>` as unknown as HTMLImageElement;
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
