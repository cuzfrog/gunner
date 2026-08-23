import type { FittingImport, ImportedFitting } from "../../../fitting";
import type { PropulsionModule, ShipProfile, Ships, SkillLevel, StatConditions } from "../../../ships";
import type { AutopilotMode } from "../../../sim";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { FittedHullSummary, ProfileParamOverrides, PropulsionSelection, SavedFitting, UserSettings } from "../../../appstate";
import type { Popup, PopupGroup } from "./popup";
import type { Timer } from "../../timer";
import type { UiEvents } from "../../events";
import type { Side } from "./side";
import type { ISidePanelSections } from "./sidePanelSections";
import type { PanelOverrides } from "./overrides";
import type { PanelTurretLink } from "./turretLink";
import type { SidePanelElements } from "./elements";

export interface SidePanel {
  readonly side: Side;
  readonly host: SidePanelHost;
  readonly els: SidePanelElements;
  readonly ships: Ships;
  readonly fittingImport: FittingImport;
  readonly imageCatalog: ImageCatalog;
  readonly i18n: I18n;
  readonly timer: Timer;
  readonly sections: ISidePanelSections;
  profile: ShipProfile | undefined;
  fittedHull: FittedHullSummary | undefined;
  fittingText: string | undefined;
  lastCommittedHull: string | undefined;
  importer: SideImporter;
  getSkillPopup(): Popup;
  getPastePopup(): Popup;
  getPropulsionVariantPopup(): Popup;
  setHost(host: SidePanelHost): void;
  setFittingPopup(popup: FittingPopupControl): void;
  setFittingPreview(preview: FittingPreviewControl): void;
  setFittingTriggerEnabled(enabled: boolean): void;
  setImporter(importer: SideImporter): void;
  isOverridden(key: keyof ProfileParamOverrides): boolean;
  recordOverride<K extends keyof ProfileParamOverrides>(key: K, value: ProfileParamOverrides[K]): void;
  clearOverrides(): void;
  clearTurret(): void;
  restoreTurret(): void;
  stateFrom(settings: UserSettings): SidePanelState;
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
}

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

export function stateSliceOf(settings: UserSettings, side: Side): SidePanelState {
  if (side === "attacker") {
    return {
      speed: settings.attackerSpeed,
      mass: settings.attackerMass,
      inertia: settings.attackerInertia,
      mode: settings.attackerMode,
      range: settings.attackerRange,
      skillLevel: settings.attackerSkillLevel,
      overload: settings.attackerOverload ?? true,
      hull: settings.attackerHull,
      propulsion: settings.attackerPropulsion,
      fitting: settings.attackerFitting,
      overrides: {},
      fittedHull: settings.attackerFittedHull,
    };
  }
  return {
    speed: settings.targetSpeed,
    mass: settings.targetMass,
    inertia: settings.targetInertia,
    mode: settings.targetMode,
    range: settings.targetRange,
    skillLevel: settings.targetSkillLevel,
    overload: settings.targetOverload ?? true,
    hull: settings.targetHull,
    propulsion: settings.targetPropulsion,
    fitting: settings.targetFitting,
    overrides: settings.targetOverrides ?? {},
    fittedHull: settings.targetFittedHull,
    sig: settings.targetSig,
  };
}

export interface FittingPopupControl {
  readonly popup: Popup;
  setTriggerEnabled(enabled: boolean): void;
  renderIfOpen(): void;
  closeIfOpen(): void;
}

export interface FittingPreviewControl {
  hide(side: Side): void;
}

export interface SideImporter {
  mostRecentFittingFor(hullName: string): SavedFitting | undefined;
  importEftFitting(text: string, persist: boolean): ImportedFitting | undefined;
  importFromText(text: string): Promise<void>;
  importFromClipboard(): Promise<void>;
}

export interface SidePanelHost {
  persistConfigChange(notify?: boolean): void;
}

export interface SidePanelDeps {
  side: Side;
  popupGroup: PopupGroup;
  els: SidePanelElements;
  i18n: I18n;
  ships: Ships;
  fittingImport: FittingImport;
  imageCatalog: ImageCatalog;
  timer: Timer;
  events: UiEvents;
  overrides: PanelOverrides;
  turretLink: PanelTurretLink;
}
