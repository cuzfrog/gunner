import type { FittingImport } from "../../../fitting";
import type { FittedHull, PropulsionModule, ShipProfile } from "../../../ships";
import type { ImageCatalog } from "../../icons";
import type { FittedHullSummary } from "../../settings";
import { isHtmlButtonElement } from "../controlsDom";
import type { Popup } from "./popup";
import type { Side } from "./side";
import type { SidePanel } from "./sidePanelContract";
import type { IPropulsionSection } from "./sidePanelSections";

export interface PropulsionVariantSectionEls {
  readonly propulsionGear: HTMLButtonElement;
  readonly propulsionVariants: HTMLElement;
}

export class PropulsionVariantSection {
  private readonly panel: SidePanel;
  private readonly els: PropulsionVariantSectionEls;
  private readonly fittingImport: FittingImport;
  private readonly imageCatalog: ImageCatalog;
  private propulsionVariantPopupOpen = false;
  readonly popup: Popup;

  constructor({
    panel, els, fittingImport, imageCatalog,
  }: { panel: SidePanel; els: PropulsionVariantSectionEls; fittingImport: FittingImport; imageCatalog: ImageCatalog }) {
    this.panel = panel;
    this.els = els;
    this.fittingImport = fittingImport;
    this.imageCatalog = imageCatalog;
    this.popup = this.createPropulsionVariantPopup();
  }

  openPropulsionVariantPopup(): void {
    const popup = this.els.propulsionVariants;
    const gear = this.els.propulsionGear;
    this.renderPropulsionVariants();
    popup.hidden = false;
    gear.setAttribute("aria-expanded", "true");
    this.propulsionVariantPopupOpen = true;
    const active = Array.from(popup.children).find((child) => child.getAttribute("aria-current") === "true");
    const activeButton = active && isHtmlButtonElement(active) ? active : null;
    const firstChild = popup.firstElementChild;
    const firstButton = firstChild && isHtmlButtonElement(firstChild) ? firstChild : null;
    (activeButton ?? firstButton)?.focus();
  }

  closePropulsionVariantPopup(): void {
    this.els.propulsionVariants.hidden = true;
    this.els.propulsionGear.setAttribute("aria-expanded", "false");
    this.propulsionVariantPopupOpen = false;
  }

  isPropulsionVariantPopupOpen(): boolean {
    return this.propulsionVariantPopupOpen;
  }

  onPropulsionVariantClick(name: string): void {
    const profile = this.panel.profile;
    const propulsion = this.fittingImport.propulsionStats(name);
    const propulsionId = this.panel.sections.propulsion.currentPropulsionId();
    if (!profile || !propulsion || !propulsionId) return;
    const fitted = this.panel.fittedHull;
    const updated: FittedHullSummary = {
      fittingName: fitted?.fittingName ?? "",
      fitted: fitted?.fitted ?? this.panel.sections.propulsion.nakedFitted(profile),
      propulsionId,
      propulsionName: name,
      propulsion,
    };
    this.panel.fittedHull = updated;
    this.panel.sections.stats.updateShipStats({ updateInertia: false, updateMass: true, updateSig: true });
    this.panel.sections.skill.setOverloadDisabled();
    this.renderPropulsionVariants();
    this.panel.host.persistConfigChange();
  }

  renderPropulsionVariants(): void {
    const popup = this.els.propulsionVariants;
    const module = this.panel.sections.propulsion.currentPropulsionModule();
    popup.innerHTML = "";
    if (!module) return;
    const fitted = this.panel.fittedHull;
    const currentName = fitted?.propulsionName ?? this.panel.sections.propulsion.defaultPropulsionName(module);
    for (const name of this.fittingImport.propulsionVariantNames(module)) {
      const iconUrl = this.imageCatalog.itemIconUrl(name);
      const item = this.createVariantButton(name, currentName, iconUrl, () => this.onPropulsionVariantClick(name));
      item.setAttribute("data-value", name);
      item.setAttribute("title", name);
      popup.appendChild(item);
    }
  }

  updateUI(): void {
    this.els.propulsionGear.disabled = this.panel.sections.propulsion.currentPropulsionId() === undefined;
    this.renderPropulsionVariants();
  }

  private createVariantButton(name: string, currentName: string, iconUrl: string | undefined, onClick: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "fitting-item";
    button.setAttribute("role", "menuitem");
    if (currentName === name) button.setAttribute("aria-current", "true");
    if (iconUrl) {
      const icon = document.createElement("img");
      icon.className = "propulsion-icon";
      icon.src = iconUrl;
      icon.alt = "";
      button.appendChild(icon);
    }
    const span = document.createElement("span");
    span.className = "fitting-item-name";
    span.textContent = name;
    span.title = name;
    button.appendChild(span);
    button.addEventListener("click", onClick);
    return button;
  }

  private createPropulsionVariantPopup(): Popup {
    return {
      isOpen: () => this.isPropulsionVariantPopupOpen(),
      open: () => this.openPropulsionVariantPopup(),
      close: () => this.closePropulsionVariantPopup(),
      focusTrigger: () => this.els.propulsionGear.focus(),
      contains: (target) =>
        target instanceof Element &&
        target.closest(`#${this.panel.side}-propulsion-variants, #${this.panel.side}-propulsion-gear`) !== null,
    };
  }
}
