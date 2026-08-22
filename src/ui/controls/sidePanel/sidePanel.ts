import type { PropulsionModule, ShipProfile, Ships, SkillLevel, StatConditions } from "../../../ships";
import type { FittingImport, ImportedFitting } from "../../../fitting";
import type { AutopilotMode } from "../../../sim";
import { num } from "../controlsDom";
import { formatNumber, isAutopilotMode } from "../controlsFormat";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import { PROPULSION_NONE, type FittedHullSummary, type ProfileParamOverrides, type PropulsionSelection, type SavedFitting } from "../../settings";
import type { Timer } from "../../timer";
import { PopupGroup, type Popup } from "../popupGroup";
import type { SidePanelElements } from "./elements";
import { HullSection } from "./hullSection";
import { PasteImportSection } from "./pasteImportSection";
import { PropulsionSection } from "./propulsionSection";
import { SkillOverloadSection } from "./skillOverloadSection";
import { StatsSection } from "./statsSection";

export type Side = "attacker" | "target";

export interface FittingPopupControl {
  readonly popup: Popup;
  renderIfOpen(): void;
  closeIfOpen(): void;
}

export interface FittingPreviewControl {
  hide(side: Side): void;
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

interface SidePanelSections {
  readonly hull: HullSection;
  readonly stats: StatsSection;
  readonly skill: SkillOverloadSection;
  readonly propulsion: PropulsionSection;
  readonly paste: PasteImportSection;
}

export class SidePanel {
  readonly side: Side;
  readonly host: SidePanelHost;
  readonly els: SidePanelElements;
  readonly ships: Ships;
  readonly fittingImport: FittingImport;
  readonly imageCatalog: ImageCatalog;
  readonly i18n: I18n;
  readonly timer: Timer;
  private profileValue?: ShipProfile;
  private fittedHullValue?: FittedHullSummary;
  private fittingTextValue?: string;
  private overridesValue: Partial<ProfileParamOverrides> = {};
  private lastCommittedHullValue?: string;
  readonly sections: SidePanelSections;
  private fittingPopup?: FittingPopupControl;
  private fittingPreview?: FittingPreviewControl;
  constructor(deps: {
    side: Side; host: SidePanelHost; popupGroup: PopupGroup; els: SidePanelElements;
    i18n: I18n; ships: Ships; fittingImport: FittingImport; imageCatalog: ImageCatalog; timer: Timer;
  }) {
    const { side, host, popupGroup, els, i18n, ships, fittingImport, imageCatalog, timer } = deps;
    this.side = side;
    this.host = host;
    this.els = els;
    this.i18n = i18n;
    this.ships = ships;
    this.fittingImport = fittingImport;
    this.imageCatalog = imageCatalog;
    this.timer = timer;
    const hull = new HullSection({ panel: this, els, ships, i18n, imageCatalog });
    const stats = new StatsSection({ panel: this, els, ships, i18n });
    const skill = new SkillOverloadSection({ panel: this, els, i18n });
    const propulsion = new PropulsionSection({ panel: this, els, ships, fittingImport, imageCatalog, i18n });
    const paste = new PasteImportSection({ panel: this, els, i18n, timer });
    this.sections = { hull, stats, skill, propulsion, paste };
    popupGroup.register(skill.popup);
    popupGroup.register(paste.popup);
    popupGroup.register(propulsion.popup);
  }
  get profile(): ShipProfile | undefined { return this.profileValue; }
  set profile(value: ShipProfile | undefined) { this.profileValue = value; }
  get fittedHull(): FittedHullSummary | undefined { return this.fittedHullValue; }
  set fittedHull(value: FittedHullSummary | undefined) { this.fittedHullValue = value; }
  get fittingText(): string | undefined { return this.fittingTextValue; }
  set fittingText(value: string | undefined) { this.fittingTextValue = value; }
  get overrides(): Partial<ProfileParamOverrides> { return this.overridesValue; }
  set overrides(value: Partial<ProfileParamOverrides>) { this.overridesValue = value; }
  get lastCommittedHull(): string | undefined { return this.lastCommittedHullValue; }
  set lastCommittedHull(value: string | undefined) { this.lastCommittedHullValue = value; }
  getSkillPopup(): Popup { return this.sections.skill.popup; }
  getPastePopup(): Popup { return this.sections.paste.popup; }
  getPropulsionVariantPopup(): Popup { return this.sections.propulsion.popup; }
  setFittingPopup(popup: FittingPopupControl): void { this.fittingPopup = popup; }
  setFittingPreview(preview: FittingPreviewControl): void { this.fittingPreview = preview; }
  renderFittingPopupIfOpen(): void { this.fittingPopup?.renderIfOpen(); }
  closeFittingPopupIfOpen(): void { this.fittingPopup?.closeIfOpen(); }
  hideFittingPreview(): void { this.fittingPreview?.hide(this.side); }
  capture(): SidePanelState {
    return {
      speed: num(this.els.speed),
      mass: num(this.els.mass),
      inertia: num(this.els.inertia),
      mode: this.currentMode(),
      range: num(this.els.range),
      skillLevel: this.sections.skill.currentSkillLevel(),
      overload: this.els.overload.checked,
      hull: this.profile?.name,
      propulsion: this.currentPropulsionSelection(),
      fitting: this.fittingText,
      overrides: this.overrides,
      fittedHull: this.fittedHull,
      sig: this.side === "target" && this.els.targetSig !== undefined ? Math.max(num(this.els.targetSig), 1) : undefined,
    };
  }
  restore(state: SidePanelState): void {
    this.fittingText = state.fitting;
    this.overrides = state.overrides;
    this.els.speed.value = formatNumber(state.speed);
    this.els.mass.value = String(state.mass);
    this.els.inertia.value = formatNumber(state.inertia, 6);
    this.els.mode.value = state.mode;
    this.els.range.value = String(state.range);
    this.sections.hull.loadHull(state.hull, state.propulsion);
    this.setSkillLevel(state.skillLevel ?? 5);
    this.setOverloadActive(state.overload ?? true);
    this.setOverloadDisabled();
    if (state.fittedHull) this.sections.hull.restoreFittingSummary(state.fittedHull);
    if (this.els.targetSig !== undefined && state.sig !== undefined) this.els.targetSig.value = String(state.sig);
    this.sections.stats.updateAlignTime();
  }
  private currentMode(): AutopilotMode {
    const value = this.els.mode.value;
    if (!isAutopilotMode(value)) throw new Error(`Invalid autopilot mode: ${value}`);
    return value;
  }
  loadHull(hullName?: string, propulsionId?: PropulsionSelection): void { this.sections.hull.loadHull(hullName, propulsionId); }
  applyImportedFitting(summary: FittedHullSummary): void { this.sections.hull.applyImportedFitting(summary); }
  clearFittedHull(): void { this.sections.hull.clearFittedHull(); }
  updateSpeedFromMass(): void { this.sections.stats.updateSpeedFromMass(); }
  updateAlignTime(): void { this.sections.stats.updateAlignTime(); }
  updateHullHint(module?: PropulsionModule): void { this.sections.hull.updateHullHint(module); }
  refreshHullInputs(): void { this.sections.hull.refreshHullInputs(); }
  recordOverride<K extends keyof ProfileParamOverrides>(key: K, value: ProfileParamOverrides[K]): void { this.overridesValue[key] = value; }
  skillConditions(): StatConditions { return this.sections.skill.skillConditions(); }
  setOverloadDisabled(): void { this.sections.skill.setOverloadDisabled(); }
  setOverloadActive(active: boolean): void { this.sections.skill.setOverloadActive(active); }
  onOverloadButtonClick(): void { this.sections.skill.onOverloadButtonClick(); }
  onSkillOrOverloadChange(updateInertia: boolean): void { this.sections.skill.onSkillOrOverloadChange(updateInertia); }
  setSkillLevel(level: SkillLevel): void { this.sections.skill.setSkillLevel(level); }
  renderSkillOptions(selectedValue: SkillLevel = this.sections.skill.currentSkillLevel() ?? 5): void {
    this.sections.skill.renderSkillOptions(selectedValue);
  }
  showImportHint(key: string, isError = false): void { this.sections.paste.showImportHint(key, isError); }
  clearImportHint(): void { this.sections.paste.clearImportHint(); }
  clearImportHintTimeout(): void { this.sections.paste.clearImportHintTimeout(); }
  onPastePopupPaste(event: ClipboardEvent): void { this.sections.paste.onPastePopupPaste(event); }
  onImportFittingClick(): void { this.sections.paste.onImportFittingClick(); }
  currentPropulsionSelection(): PropulsionSelection | undefined { return this.sections.propulsion.currentPropulsionSelection(); }
  renderPropulsionOptions(selectedId: string = this.currentPropulsionSelection() ?? ""): void {
    this.sections.propulsion.renderPropulsionOptions(selectedId);
  }
  onPropulsionChange(): void { this.sections.propulsion.onPropulsionChange(); }
  onHullInput(): void { this.sections.hull.onHullInput(); }
  onHullChange(): void { this.sections.hull.onHullChange(); }
}
