import type { FittingImport } from "../../../fitting";
import type { TypeId } from "../../../gamedata/ids";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { FittedHullSummary } from "../../../appstate";
import type { Popup } from "../popup";
import type { SidePanel } from "./sidePanelContract";
import { VariantSection, type VariantItem } from "../shared";

export interface PropulsionVariantSectionEls {
  readonly propulsionGear: HTMLButtonElement;
  readonly propulsionVariants: HTMLElement;
}

export class PropulsionVariantSection {
  private readonly panel: SidePanel;
  private readonly fittingImport: FittingImport;
  private readonly i18n: I18n;
  private readonly imageCatalog: ImageCatalog;
  private readonly section: VariantSection;

  constructor({
    panel, els, fittingImport, i18n, imageCatalog,
  }: { panel: SidePanel; els: PropulsionVariantSectionEls; fittingImport: FittingImport; i18n: I18n; imageCatalog: ImageCatalog }) {
    this.panel = panel;
    this.fittingImport = fittingImport;
    this.i18n = i18n;
    this.imageCatalog = imageCatalog;
    this.section = new VariantSection({
      gear: els.propulsionGear,
      popupEl: els.propulsionVariants,
      listShape: { itemClass: "fitting-item btn", nameClass: "fitting-item-name", iconClass: "propulsion-icon", role: "menuitem" },
      variants: () => this.discoverVariants(),
      currentId: () => this.resolveCurrentVariantId(),
      onSelect: (id) => this.panel.sections.propulsion.applyPropulsionVariant(id),
      isEnabled: () => this.panel.sections.propulsion.currentPropulsionId() !== undefined,
    });
  }

  get popup(): Popup { return this.section.popup; }

  closePropulsionVariantPopup(): void {
    this.section.closePopup();
  }

  renderPropulsionVariants(): void {
    this.section.renderVariants();
  }

  updateUI(): void {
    this.section.updateUI();
  }

  private discoverVariants(): readonly VariantItem[] {    const module = this.panel.sections.propulsion.currentPropulsionModule();
    if (!module) return [];
    const language = this.i18n.current();
    return this.fittingImport.propulsionVariantNames(module).map((variant) => ({
      id: variant.id,
      name: this.fittingImport.itemNameForId(variant.id, language) ?? variant.name,
      iconUrl: this.imageCatalog.itemIconUrl(variant.id),
    }));
  }

  private resolveCurrentVariantId(): TypeId | undefined {
    const module = this.panel.sections.propulsion.currentPropulsionModule();
    if (!module) return undefined;
    const fitted = this.panel.fittedHull;
    return this.panel.sections.propulsion.resolvePropulsionVariant(module, fitted)?.id;
  }
}
