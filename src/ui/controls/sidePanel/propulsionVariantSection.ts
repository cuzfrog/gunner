import type { FittingImport } from "../../../fitting";
import type { TypeId } from "../../../gamedata/ids";
import type { ShipProfile } from "../../../ships";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { FittedHullSummary } from "../../../appstate";
import { isHtmlButtonElement } from "../controlsDom";
import type { Popup } from "../popup";
import type { Side } from "../side";
import { SelectableListImpl } from "../shared";
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
  private readonly variantList: SelectableListImpl;
  readonly popup: Popup;

  constructor({
    panel, els, fittingImport, i18n, imageCatalog,
  }: { panel: SidePanel; els: PropulsionVariantSectionEls; fittingImport: FittingImport; i18n: I18n; imageCatalog: ImageCatalog }) {
    this.panel = panel;
    this.els = els;
    this.fittingImport = fittingImport;
    this.i18n = i18n;
    this.imageCatalog = imageCatalog;
    this.variantList = new SelectableListImpl({
      itemClass: "fitting-item btn",
      nameClass: "fitting-item-name",
      iconClass: "propulsion-icon",
      role: "menuitem",
    });
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
    const currentVariant = this.panel.sections.propulsion.resolvePropulsionVariant(module, fitted);
    const currentId = currentVariant?.id;
    const variants = this.fittingImport.propulsionVariantNames(module);
    const items = variants.map((variant) => ({
      value: variant.id,
      label: this.fittingImport.itemNameForId(variant.id, this.i18n.current()),
      title: this.fittingImport.itemNameForId(variant.id, this.i18n.current()),
      iconUrl: this.imageCatalog.itemIconUrl(variant.id),
      selected: currentId === variant.id,
    }));
    const buttons = this.variantList.render(popup, items);
    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      buttons[i].addEventListener("click", () => this.onPropulsionVariantClick(variant.id, variant.name));
    }
  }

  updateUI(): void {
    this.els.propulsionGear.disabled = this.panel.sections.propulsion.currentPropulsionId() === undefined;
    this.renderPropulsionVariants();
  }

  private createPropulsionVariantPopup(): Popup {
    const id = sideId(this.panel.side);
    return {
      isOpen: () => this.isPropulsionVariantPopupOpen(),
      open: () => this.openPropulsionVariantPopup(),
      close: () => this.closePropulsionVariantPopup(),
      focusTrigger: () => this.els.propulsionGear.focus(),
      contains: (domTarget) =>
        domTarget instanceof Element &&
        domTarget.closest(`#${id}-propulsion-variants, #${id}-propulsion-gear`) !== null,
    };
  }
}

function sideId(side: Side): "ship-a" | "ship-b" {
  return side === "shipA" ? "ship-a" : "ship-b";
}
