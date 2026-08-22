import type { ImportedFitting } from "../../../fitting";
import type { PropulsionModule, ShipProfile, Ships, SkillLevel, StatConditions } from "../../../ships";
import type { AutopilotMode } from "../../../sim";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { FittedHullSummary, ProfileParamOverrides, PropulsionSelection, SavedFitting } from "../../settings";
import type { Popup } from "../popupGroup";
import type { Side } from "./side";
import type { ISidePanelSections } from "./sidePanelSections";

export interface SidePanelState {
  readonly speed: number;
  readonly mass: number;
  readonly inertia: number;
  readonly mode: AutopilotMode;
  readonly range: number;
  readonly skillLevel: SkillLevel | undefined;
  readonly overload: boolean;
  readonly hull: string | undefined;
  readonly propulsion: PropulsionSelection | undefined;
  readonly fitting: string | undefined;
  readonly overrides: Partial<ProfileParamOverrides>;
  readonly fittedHull: FittedHullSummary | undefined;
  readonly sig?: number;
}

export interface FittingPopupControl {
  readonly popup: Popup;
  renderIfOpen(): void;
  closeIfOpen(): void;
}

export interface FittingPreviewControl {
  hide(side: Side): void;
}

export interface AttackerTurretHooks {
  onFittedHullCleared(): void;
  restoreTurret(): void;
}

export interface FittingImporter {
  mostRecentFittingFor(hullName: string): SavedFitting | undefined;
  importEftFitting(text: string, persist: boolean): ImportedFitting | undefined;
  importFromText(text: string): Promise<void>;
  importFromClipboard(): Promise<void>;
}

export interface SidePanelHost {
  updateFittingTrigger(enabled: boolean): void;
  persistConfigChange(notify?: boolean): void;
  attackerTurretHooks: AttackerTurretHooks;
  importer: FittingImporter;
}

export interface ISidePanel {
  readonly side: Side;
  readonly host: SidePanelHost;
  readonly sections: ISidePanelSections;
  profile: ShipProfile | undefined;
  fittedHull: FittedHullSummary | undefined;
  fittingText: string | undefined;
  overrides: Partial<ProfileParamOverrides>;
  lastCommittedHull: string | undefined;
  setFittingPopup(popup: FittingPopupControl): void;
  setFittingPreview(preview: FittingPreviewControl): void;
  renderFittingPopupIfOpen(): void;
  closeFittingPopupIfOpen(): void;
  hideFittingPreview(): void;
  capture(): SidePanelState;
  restore(state: SidePanelState): void;
  loadHull(hullName?: string, propulsionId?: PropulsionSelection): void;
  applyImportedFitting(summary: FittedHullSummary): void;
  clearFittedHull(): void;
  updateSpeedFromMass(): void;
  updateAlignTime(): void;
  updateHullHint(module?: PropulsionModule): void;
  refreshHullInputs(): void;
  recordOverride<K extends keyof ProfileParamOverrides>(key: K, value: ProfileParamOverrides[K]): void;
  skillConditions(): StatConditions;
  setOverloadDisabled(): void;
  setOverloadActive(active: boolean): void;
  onOverloadButtonClick(): void;
  onSkillOrOverloadChange(updateInertia: boolean): void;
  setSkillLevel(level: SkillLevel): void;
  renderSkillOptions(selectedValue?: SkillLevel): void;
  showImportHint(key: string, isError?: boolean): void;
  clearImportHint(): void;
  clearImportHintTimeout(): void;
  onPastePopupPaste(event: ClipboardEvent): void;
  onImportFittingClick(): void;
  currentPropulsionSelection(): PropulsionSelection | undefined;
  renderPropulsionOptions(selectedId?: string): void;
  onPropulsionChange(): void;
  onHullInput(): void;
  onHullChange(): void;
  getSkillPopup(): Popup;
  getPastePopup(): Popup;
  getPropulsionVariantPopup(): Popup;
}
