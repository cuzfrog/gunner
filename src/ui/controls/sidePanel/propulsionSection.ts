import type { FittingImport } from "../../../fitting";
import type { TypeId } from "../../../gamedata/ids";
import type { FittedHull, PropulsionId, PropulsionModule, ShipProfile, Ships } from "../../../ships";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import { PROPULSION_NONE, type FittedHullSummary, type PropulsionSelection } from "../../../appstate";
import { propulsionOptionLabel } from "../controlsFormat";
import type { Popup, PopupGroup } from "../popup";
import type { SidePanel } from "./sidePanelContract";
import type { IPropulsionSection } from "./sidePanelSections";
import { PropulsionVariantSection, type PropulsionVariantSectionEls } from "./propulsionVariantSection";

export interface PropulsionSectionEls extends PropulsionVariantSectionEls {
  readonly propulsion: HTMLSelectElement;
  readonly propulsionOptions: HTMLElement;
}

export class PropulsionSection implements IPropulsionSection {
  private readonly panel: SidePanel;
  private readonly els: PropulsionSectionEls;
  private readonly ships: Ships;
  private readonly fittingImport: FittingImport;
  private readonly imageCatalog: ImageCatalog;
  private readonly i18n: I18n;
  private readonly popupGroup: PopupGroup;
  private readonly variants: PropulsionVariantSection;

  constructor({
    panel, els, ships, fittingImport, imageCatalog, i18n, popupGroup,
  }: { panel: SidePanel; els: PropulsionSectionEls; ships: Ships; fittingImport: FittingImport; imageCatalog: ImageCatalog; i18n: I18n; popupGroup: PopupGroup }) {
    this.panel = panel;
    this.els = els;
    this.ships = ships;
    this.fittingImport = fittingImport;
    this.imageCatalog = imageCatalog;
    this.i18n = i18n;
    this.popupGroup = popupGroup;
    this.variants = new PropulsionVariantSection({
      panel, els: { propulsionGear: els.propulsionGear, propulsionVariants: els.propulsionVariants },
      fittingImport, i18n, imageCatalog,
    });
    this.els.propulsion.addEventListener("change", () => this.onPropulsionChange());
    this.els.propulsionGear.addEventListener("click", () => this.popupGroup.toggle(this.variants.popup));
  }

  get popup(): Popup {
    return this.variants.popup;
  }

  currentPropulsionSelection(): PropulsionSelection | undefined {
    const value = this.els.propulsion.value;
    if (value === PROPULSION_NONE) return PROPULSION_NONE;
    return this.ships.parsePropulsionId(value);
  }

  currentPropulsionId(): PropulsionId | undefined {
    const selection = this.currentPropulsionSelection();
    return selection === PROPULSION_NONE ? undefined : selection;
  }

  currentPropulsionModule(): PropulsionModule | undefined {
    if (!this.panel.profile) return undefined;
    const id = this.currentPropulsionId();
    if (!id) return undefined;
    return this.ships.fittingOption(this.panel.profile, id);
  }

  renderPropulsionOptions(selectedId: string = this.currentPropulsionSelection() ?? ""): void {
    const profile = this.panel.profile;
    const select = this.els.propulsion;
    const group = this.els.propulsionOptions;
    const gear = this.els.propulsionGear;
    select.innerHTML = "";
    group.innerHTML = "";
    group.setAttribute("aria-label", this.i18n.t("label.propulsion"));
    select.disabled = !profile;

    const all = this.ships.allFittingOptions();
    const modules = profile ? this.ships.fittingOptions(profile) : all.slice(0, 3);
    const moduleSet = new Set(modules.map((module) => module.id));
    const selectedPropulsionId = this.ships.parsePropulsionId(selectedId);
    const noneRequested = selectedId === PROPULSION_NONE;
    let selected = "";

    for (const module of modules) {
      const option = document.createElement("option");
      option.value = module.id;
      option.textContent = propulsionOptionLabel(module);
      select.appendChild(option);
      const button = this.createPropulsionButton(group, module, () => this.onPropulsionButtonClick(module.id));
      button.disabled = !profile;
      button.setAttribute("aria-disabled", String(!profile));
    }

    const noneOption = document.createElement("option");
    noneOption.value = PROPULSION_NONE;
    noneOption.hidden = true;
    select.appendChild(noneOption);

    if (profile) {
      selected = noneRequested
        ? PROPULSION_NONE
        : selectedPropulsionId && moduleSet.has(selectedPropulsionId)
          ? selectedPropulsionId
          : (modules[0]?.id ?? "");
    }

    select.value = selected;
    this.setPropulsionActive(selected);
    gear.disabled = !profile || selected === PROPULSION_NONE || selected === "";
    this.variants.closePropulsionVariantPopup();
    this.variants.renderPropulsionVariants();
    this.panel.sections.skill.setOverloadDisabled();
  }

  onPropulsionChange(): void {
    const profile = this.panel.profile;
    if (!profile) return;
    const propulsionId = this.currentPropulsionId();
    const fitted = this.panel.fittedHull;
    let updated: FittedHullSummary | undefined;
    if (propulsionId) {
      const module = this.ships.fittingOption(profile, propulsionId);
      if (module) {
        const variant = this.defaultPropulsionVariant(module);
        const propulsionModuleId = variant?.id;
        const propulsionName = variant?.name ?? module.label;
        const propulsion = (propulsionModuleId ? this.fittingImport.propulsionStatsById(propulsionModuleId) : undefined) ?? module;
        updated = {
          fittingName: fitted?.fittingName ?? "",
          fitted: fitted?.fitted ?? this.nakedFitted(profile),
          propulsionId,
          propulsionModuleId,
          propulsionName,
          propulsionKind: module.kind,
          propulsion,
        };
      }
    } else if (fitted) {
      updated = fitted.fittingName ? { ...fitted, propulsionId: undefined, propulsionModuleId: undefined, propulsionName: undefined, propulsionKind: undefined, propulsion: undefined } : undefined;
    }
    if (updated) {
      this.panel.fittedHull = updated;
    } else if (!propulsionId && fitted && !fitted.fittingName) {
      this.panel.fittedHull = undefined;
    }
    this.panel.sections.stats.updateShipStats({ updateInertia: false, updateMass: true, updateSig: true });
    this.panel.sections.skill.setOverloadDisabled();
    this.variants.updateUI();
    this.panel.host.persistConfigChange();
  }

  setPropulsionActive(propulsionId: string): void {
    const select = this.els.propulsion;
    const group = this.els.propulsionOptions;
    select.value = propulsionId;
    for (const button of group.children) {
      const active = button.getAttribute("data-value") === propulsionId;
      button.setAttribute("aria-pressed", String(active));
    }
  }

  private onPropulsionButtonClick(propulsionId: string): void {
    const profile = this.panel.profile;
    if (!profile) return;
    const id = this.ships.parsePropulsionId(propulsionId);
    if (!id || !this.ships.fittingOption(profile, id)) return;
    const currentId = this.currentPropulsionId();
    const next = currentId === id ? PROPULSION_NONE : id;
    this.setPropulsionActive(next);
    this.els.propulsion.dispatchEvent(new Event("change"));
  }

  defaultPropulsionVariant(module: PropulsionModule): { readonly id: TypeId; readonly name: string } | undefined {
    const variants = this.fittingImport.propulsionVariantNames(module);
    return variants.find((variant) => variant.name === module.label) ?? variants[0];
  }

  defaultPropulsionName(module: PropulsionModule): string {
    return this.defaultPropulsionVariant(module)?.name ?? module.label;
  }

  nakedFitted(profile: ShipProfile): FittedHull {
    return { mass: profile.mass, massMultiplier: 1, speedMultiplier: 1, inertiaMultiplier: 1, sigMultiplier: 1, sigRadiusAdd: 0 };
  }

  private createPropulsionButton(container: HTMLElement, module: PropulsionModule, onClick: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn truncate";
    button.setAttribute("data-value", module.id);
    button.setAttribute("aria-pressed", "false");
    const text = propulsionOptionLabel(module);
    button.setAttribute("title", text);
    const iconUrl = this.imageCatalog.itemIconUrl(module.label);
    if (iconUrl) {
      const icon = document.createElement("img");
      icon.className = "propulsion-icon";
      icon.src = iconUrl;
      icon.alt = "";
      button.appendChild(icon);
    }
    const label = document.createElement("span");
    label.textContent = text;
    button.appendChild(label);
    button.addEventListener("click", onClick);
    container.appendChild(button);
    return button;
  }
}
