import type { ImportedFitting } from "../../../fitting";
import type { TypeId } from "../../../gamedata/ids";
import type {
  FittedHull,
  PropulsionId,
  PropulsionModule,
  PropulsionStats,
  ShipProfile,
  Ships,
  SkillLevel,
  StatConditions,
} from "../../../ships";
import type { I18n } from "../../i18n";
import type { FittedHullSummary, ProfileParamOverrides, PropulsionSelection } from "../../../appstate";
import type { Popup } from "../popup";
import type { INavSection } from "./navSection";

export interface IHullSection {
  onHullInput(): void;
  onHullChange(): void;
  applyProfile(profile: ShipProfile, persist: boolean, autoSelect?: boolean): void;
  applyHull(profile: ShipProfile, propulsionId?: PropulsionSelection, persist?: boolean, updateStats?: boolean): void;
  loadHull(hullName?: string, propulsionId?: PropulsionSelection): void;
  clearHull(resetInput: boolean, persist: boolean): void;
  clearFittedHull(): void;
  setHullValidation(isInvalid: boolean): void;
  updateHullHint(module?: PropulsionModule): void;
  refreshHullInputs(): void;
  applyImportedFitting(summary: FittedHullSummary): void;
  restoreFittingSummary(summary: FittedHullSummary): void;
}

export interface IStatsSection {
  updateShipStats(options: { updateInertia: boolean; updateMass: boolean; updateSig: boolean }): void;
  updateSpeedFromMass(): void;
  updateAlignTime(): void;
  isOverridden(key: keyof ProfileParamOverrides): boolean;
  currentFittedPropulsion(fitted: FittedHullSummary): PropulsionStats | undefined;
  currentFittedPropulsionModule(fitted: FittedHullSummary | undefined): PropulsionModule | undefined;
  currentBaseMaxSpeed(): number;
}

export interface ISkillOverloadSection {
  readonly popup: Popup;
  skillConditions(): StatConditions;
  setOverloadDisabled(): void;
  setOverloadActive(active: boolean): void;
  setWeaponOverloaded(overloaded: boolean): void;
  isWeaponOverloaded(): boolean;
  onOverloadButtonClick(): void;
  onSkillOrOverloadChange(updateInertia: boolean): void;
  currentSkillLevel(): SkillLevel | undefined;
  setSkillLevel(level: SkillLevel): void;
  setSkillActive(level: SkillLevel): void;
  renderSkillOptions(selectedValue?: SkillLevel): void;
  openSkillPopup(): void;
  closeSkillPopup(): void;
  isSkillPopupOpen(): boolean;
  onSkillChoiceInput(): void;
}

export interface IPropulsionSection {
  readonly popup: Popup;
  currentPropulsionSelection(): PropulsionSelection | undefined;
  currentPropulsionId(): PropulsionId | undefined;
  currentPropulsionModule(): PropulsionModule | undefined;
  renderPropulsionOptions(selectedId?: PropulsionSelection): void;
  onPropulsionChange(): void;
  setPropulsionActive(propulsionId: string): void;
  resolvePropulsionVariant(module: PropulsionModule, fitted: FittedHullSummary | undefined): { readonly id: TypeId; readonly name: string } | undefined;
  defaultPropulsionName(module: PropulsionModule): string;
  nakedFitted(profile: ShipProfile): FittedHull;
}

export interface IPasteImportSection {
  readonly popup: Popup;
  onImportFittingClick(): void;
  onPastePopupPaste(event: ClipboardEvent): void;
  showImportHint(key: string, isError?: boolean): void;
  clearImportHint(): void;
  clearImportHintTimeout(): void;
  openPastePopup(): void;
  closePastePopup(): void;
  isPastePopupOpen(): boolean;
}

export interface ISidePanelSections {
  readonly hull: IHullSection;
  readonly nav: INavSection;
  readonly stats: IStatsSection;
  readonly skill: ISkillOverloadSection;
  readonly propulsion: IPropulsionSection;
  readonly paste: IPasteImportSection;
}
