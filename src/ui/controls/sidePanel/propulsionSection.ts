import type { FittingImport } from "../../../fitting";
import type { TypeId } from "../../../gamedata/ids";
import type { FittedHull, PropulsionId, PropulsionKind, PropulsionModule, ShipProfile, Ships } from "../../../ships";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import { PROPULSION_NONE, type FittedHullSummary, type PropulsionSelection } from "../../../appstate";
import { propulsionOptionLabel } from "../controlsFormat";
import { ChoiceGroupImpl, type ChoiceGroupOption } from "../choiceGroup";
import type { Popup, PopupGroup } from "../popup";
import type { SidePanel } from "./sidePanelContract";
import { html } from "../markup";
import type { IPropulsionSection } from "./sidePanelSections";
import { PropulsionVariantSection, type PropulsionVariantSectionEls } from "./propulsionVariantSection";
import type { DimensionedSelection, PropulsionDimension } from "../../selectionSession";

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
  private readonly propulsionChoice: ChoiceGroupImpl;
  private readonly propulsionSelection: DimensionedSelection<PropulsionDimension>;

  constructor({
    panel, els, ships, fittingImport, imageCatalog, i18n, popupGroup, propulsionSelection,
  }: { panel: SidePanel; els: PropulsionSectionEls; ships: Ships; fittingImport: FittingImport; imageCatalog: ImageCatalog; i18n: I18n; popupGroup: PopupGroup; propulsionSelection: DimensionedSelection<PropulsionDimension> }) {
    this.panel = panel;
    this.els = els;
    this.ships = ships;
    this.fittingImport = fittingImport;
    this.imageCatalog = imageCatalog;
    this.i18n = i18n;
    this.popupGroup = popupGroup;
    this.propulsionSelection = propulsionSelection;
    this.propulsionChoice = new ChoiceGroupImpl({
      group: els.propulsionOptions,
      select: els.propulsion,
      shape: { buttonClass: "btn", iconClass: "choice-icon", labelClass: "", truncateButton: true, toggleNoneValue: PROPULSION_NONE },
    });
    this.variants = new PropulsionVariantSection({
      panel, els: { propulsionGear: els.propulsionGear, propulsionVariants: els.propulsionVariants },
      fittingImport, i18n, imageCatalog,
    });
    this.els.propulsion.addEventListener("input", () => this.onPropulsionChange());
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

  renderPropulsionOptions(selectedId: PropulsionSelection | undefined = this.currentPropulsionSelection()): void {
    const profile = this.panel.profile;
    const select = this.els.propulsion;
    const group = this.els.propulsionOptions;
    const gear = this.els.propulsionGear;
    group.setAttribute("aria-label", this.i18n.t("label.propulsion"));
    select.disabled = !profile;

    const all = this.ships.allFittingOptions();
    const modules = profile ? this.ships.fittingOptions(profile) : all.slice(0, 3);
    const moduleSet = new Set(modules.map((module) => module.id));
    const noneRequested = selectedId === PROPULSION_NONE;
    const requestedId = noneRequested || selectedId === undefined ? undefined : selectedId;
    let selected = "";

    const options: ChoiceGroupOption[] = modules.map((module) => ({
      value: module.id,
      label: propulsionOptionLabel(module),
      hint: propulsionOptionLabel(module),
      iconUrl: this.imageCatalog.itemIconUrl(module.iconId),
      disabled: !profile,
    }));

    this.propulsionChoice.render(options, "");

    if (profile) {
      selected = noneRequested
        ? PROPULSION_NONE
        : requestedId && moduleSet.has(requestedId)
          ? requestedId
          : (modules[0]?.id ?? "");
    }

    const noneOption = html`<option value=${PROPULSION_NONE} hidden></option>` as unknown as HTMLElement;
    select.appendChild(noneOption);

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
        const variant = this.resolvePropulsionVariantWithMemory(module, fitted);
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
        if (propulsionModuleId) {
          this.propulsionSelection.noteApplied({ kind: module.kind, module }, { moduleId: propulsionModuleId });
        }
      }
    } else if (fitted) {
      updated = { ...fitted, propulsionId: undefined, propulsionKind: undefined, propulsion: undefined };
    }
    if (updated) {
      this.panel.fittedHull = updated;
    }
    this.panel.sections.stats.updateShipStats({ updateInertia: false, updateMass: true, updateSig: true });
    this.panel.sections.skill.setOverloadDisabled();
    this.variants.updateUI();
    this.panel.host.persistConfigChange();
  }

  notePropulsionVariant(kind: PropulsionKind, moduleId: TypeId): void {
    const profile = this.panel.profile;
    if (!profile) return;
    const propulsionId = this.currentPropulsionId();
    if (!propulsionId) return;
    const module = this.ships.fittingOption(profile, propulsionId);
    if (!module || module.kind !== kind) return;
    this.propulsionSelection.noteApplied({ kind, module }, { moduleId });
  }

  seedPropulsionMemory(): void {
    const fitted = this.panel.fittedHull;
    if (!fitted?.propulsionModuleId || !fitted.propulsionKind) return;
    const module = this.currentPropulsionModule();
    if (!module || module.kind !== fitted.propulsionKind) return;
    const variants = this.fittingImport.propulsionVariantNames(module);
    const valid = variants.some((variant) => variant.id === fitted.propulsionModuleId);
    if (!valid) return;
    this.propulsionSelection.noteApplied({ kind: module.kind, module }, { moduleId: fitted.propulsionModuleId });
  }

  setPropulsionActive(propulsionId: string): void {
    const select = this.els.propulsion;
    select.value = propulsionId;
    this.propulsionChoice.set(propulsionId);
  }

  defaultPropulsionVariant(module: PropulsionModule): { readonly id: TypeId; readonly name: string } | undefined {
    const variants = this.fittingImport.propulsionVariantNames(module);
    return variants.find((variant) => variant.id === module.defaultModuleId) ?? variants[0];
  }

  resolvePropulsionVariant(module: PropulsionModule, fitted: FittedHullSummary | undefined): { readonly id: TypeId; readonly name: string } | undefined {
    const variants = this.fittingImport.propulsionVariantNames(module);
    if (fitted?.propulsionModuleId !== undefined) {
      const preserved = variants.find((variant) => variant.id === fitted.propulsionModuleId);
      if (preserved) return preserved;
    }
    if (fitted?.propulsionName !== undefined) {
      const byName = variants.find((variant) => variant.name === fitted.propulsionName);
      if (byName) return byName;
    }
    return this.defaultPropulsionVariant(module);
  }

  private resolvePropulsionVariantWithMemory(module: PropulsionModule, fitted: FittedHullSummary | undefined): { readonly id: TypeId; readonly name: string } | undefined {
    const variants = this.fittingImport.propulsionVariantNames(module);
    if (fitted?.propulsionModuleId !== undefined) {
      const preserved = variants.find((variant) => variant.id === fitted.propulsionModuleId);
      if (preserved) return preserved;
    }
    if (fitted?.propulsionName !== undefined) {
      const byName = variants.find((variant) => variant.name === fitted.propulsionName);
      if (byName) return byName;
    }
    const remembered = this.propulsionSelection.selectionFor({ kind: module.kind, module });
    const memoryVariant = variants.find((variant) => variant.id === remembered.moduleId);
    if (memoryVariant) return memoryVariant;
    return this.defaultPropulsionVariant(module);
  }

  defaultPropulsionName(module: PropulsionModule): string {
    return this.defaultPropulsionVariant(module)?.name ?? module.label;
  }

  nakedFitted(profile: ShipProfile): FittedHull {
    return { mass: profile.mass, massMultiplier: 1, speedMultiplier: 1, inertiaMultiplier: 1, sigMultiplier: 1, sigRadiusAdd: 0, mwdSigBloomMultiplier: 1 };
  }

}
