import type { FittingImport } from "../../../fitting";
import type { TypeId } from "../../../gamedata/ids";
import type { PropulsionModule, ShipProfile } from "../../../ships";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { FittedHullSummary } from "../../../appstate";
import { isHtmlButtonElement } from "../controlsDom";
import type { Popup } from "../popup";
import type { Side } from "../side";
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
  private readonly i18n: I18n;
  private readonly imageCatalog: ImageCatalog;
  private propulsionVariantPopupOpen = false;
  readonly popup: Popup;

  constructor({
    panel, els, fittingImport, i18n, imageCatalog,
  }: { panel: SidePanel; els: PropulsionVariantSectionEls; fittingImport: FittingImport; i18n: I18n; imageCatalog: ImageCatalog }) {
    this.panel = panel;
    this.els = els;
    this.fittingImport = fittingImport;
    this.i18n = i18n;
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

  onPropulsionVariantClick(id: TypeId, name: string): void {
    const profile = this.panel.profile;
    const propulsion = this.fittingImport.propulsionStatsById(id);
    const propulsionId = this.panel.sections.propulsion.currentPropulsionId();
    if (!profile || !propulsion || !propulsionId) return;
    const fitted = this.panel.fittedHull;
    const updated: FittedHullSummary = {
      fittingName: fitted?.fittingName ?? "",
      fitted: fitted?.fitted ?? this.panel.sections.propulsion.nakedFitted(profile),
      propulsionId,
      propulsionModuleId: id,
      propulsionName: name,
      propulsionKind: this.panel.sections.propulsion.currentPropulsionModule()?.kind,
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
    const currentId = this.currentPropulsionVariantId(module, fitted);
    for (const variant of this.fittingImport.propulsionVariantNames(module)) {
      const iconUrl = this.imageCatalog.itemIconUrl(variant.id);
      const displayName = this.fittingImport.itemNameForId(variant.id, this.i18n.current());
      const item = this.createVariantButton(variant.id, currentId, iconUrl, displayName, () => this.onPropulsionVariantClick(variant.id, variant.name));
      item.setAttribute("data-value", variant.id);
      item.setAttribute("title", displayName);
      popup.appendChild(item);
    }
  }

  private currentPropulsionVariantId(module: PropulsionModule, fitted: FittedHullSummary | undefined): TypeId | undefined {
    const variants = this.fittingImport.propulsionVariantNames(module);
    if (fitted?.propulsionModuleId !== undefined) return fitted.propulsionModuleId;
    if (fitted?.propulsionName !== undefined) return variants.find((variant) => variant.name === fitted.propulsionName)?.id;
    return variants.find((variant) => variant.id === module.defaultModuleId)?.id ?? variants[0]?.id;
  }

  updateUI(): void {
    this.els.propulsionGear.disabled = this.panel.sections.propulsion.currentPropulsionId() === undefined;
    this.renderPropulsionVariants();
  }

  private createVariantButton(
    id: TypeId,
    currentId: TypeId | undefined,
    iconUrl: string | undefined,
    displayName: string,
    onClick: () => void,
  ): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "fitting-item btn";
    button.setAttribute("role", "menuitem");
    if (currentId === id) button.setAttribute("aria-current", "true");
    if (iconUrl) {
      const icon = document.createElement("img");
      icon.className = "propulsion-icon";
      icon.src = iconUrl;
      icon.alt = "";
      button.appendChild(icon);
    }
    const span = document.createElement("span");
    span.className = "fitting-item-name truncate";
    span.textContent = displayName;
    span.title = displayName;
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
      contains: (domTarget) =>
        domTarget instanceof Element &&
        domTarget.closest(`#${this.panel.side}-propulsion-variants, #${this.panel.side}-propulsion-gear`) !== null,
    };
  }
}
