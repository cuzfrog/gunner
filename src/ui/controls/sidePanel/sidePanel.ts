import type { PropulsionModule, ShipProfile, Ships, SkillLevel, StatConditions } from "../../../ships";
import type { FittingImport } from "../../../fitting";
import type { AutopilotMode } from "../../../sim";
import {
  isAutopilotMode,
  type FittedHullSummary,
  type ProfileParamOverrides,
  type PropulsionSelection,
  type UserSettings,
} from "../../../appstate";
import { num } from "../controlsDom";
import { formatNumber } from "../controlsFormat";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { Timer } from "../../timer";
import type { UiEvents } from "../../events";
import type { Popup, PopupGroup } from "./popup";
import type { SidePanelElements } from "./elements";
import { HullSection } from "./hullSection";
import { PasteImportSection } from "./pasteImportSection";
import { PropulsionSection } from "./propulsionSection";
import { SkillOverloadSection } from "./skillOverloadSection";
import { StatsSection } from "./statsSection";
import type { Side } from "./side";
import type { TurretController, TurretOverrides } from "../turret";
import {
  stateSliceOf,
  type FittingPopupControl,
  type FittingPreviewControl,
  type SideImporter,
  type SidePanel,
  type SidePanelDeps,
  type SidePanelHost,
  type SidePanelState,
} from "./sidePanelContract";
import type { ISidePanelSections } from "./sidePanelSections";

const NOOP_HOST: SidePanelHost = {
  persistConfigChange() {},
};

export class SidePanelImpl implements SidePanel {
  readonly side: Side;
  get host(): SidePanelHost { return this.hostValue; }
  readonly els: SidePanelElements;
  readonly ships: Ships;
  readonly fittingImport: FittingImport;
  readonly imageCatalog: ImageCatalog;
  readonly i18n: I18n;
  readonly timer: Timer;
  private readonly popupGroup: PopupGroup;
  private readonly turret?: TurretController;
  private readonly turretOverrides?: TurretOverrides;
  private hostValue: SidePanelHost = NOOP_HOST;
  private profileValue?: ShipProfile;
  private fittedHullValue?: FittedHullSummary;
  private fittingTextValue?: string;
  private overridesValue: Partial<ProfileParamOverrides> = {};
  private lastCommittedHullValue?: string;
  private importerValue?: SideImporter;
  readonly sections: ISidePanelSections;
  private fittingPopup?: FittingPopupControl;
  private fittingPreview?: FittingPreviewControl;

  constructor(deps: SidePanelDeps) {
    const { side, popupGroup, els, i18n, ships, fittingImport, imageCatalog, timer, events, turret, turretOverrides } = deps;
    this.side = side;
    this.popupGroup = popupGroup;
    this.els = els;
    this.i18n = i18n;
    this.ships = ships;
    this.fittingImport = fittingImport;
    this.imageCatalog = imageCatalog;
    this.timer = timer;
    this.turret = turret;
    this.turretOverrides = turretOverrides;
    const hull = new HullSection({ panel: this, els, ships, i18n, imageCatalog });
    const stats = new StatsSection({ panel: this, els, ships, i18n });
    const skill = new SkillOverloadSection({ panel: this, els, i18n });
    const propulsion = new PropulsionSection({ panel: this, els, ships, fittingImport, imageCatalog, i18n });
    const paste = new PasteImportSection({ panel: this, els, i18n, timer });
    this.sections = { hull, stats, skill, propulsion, paste };
    popupGroup.register(skill.popup);
    popupGroup.register(paste.popup);
    popupGroup.register(propulsion.popup);
    events.onLanguageChanged(() => {
      this.renderPropulsionOptions();
      this.clearImportHint();
      this.refreshHullInputs();
      this.updateHullHint();
      this.renderSkillOptions();
    });
  }

  get profile(): ShipProfile | undefined { return this.profileValue; }
  set profile(value: ShipProfile | undefined) { this.profileValue = value; }
  get fittedHull(): FittedHullSummary | undefined { return this.fittedHullValue; }
  set fittedHull(value: FittedHullSummary | undefined) { this.fittedHullValue = value; }
  get fittingText(): string | undefined { return this.fittingTextValue; }
  set fittingText(value: string | undefined) { this.fittingTextValue = value; }
  get lastCommittedHull(): string | undefined { return this.lastCommittedHullValue; }
  set lastCommittedHull(value: string | undefined) { this.lastCommittedHullValue = value; }
  get importer(): SideImporter {
    if (!this.importerValue) throw new Error("SidePanel importer not set");
    return this.importerValue;
  }

  getSkillPopup(): Popup { return this.sections.skill.popup; }
  getPastePopup(): Popup { return this.sections.paste.popup; }
  getPropulsionVariantPopup(): Popup { return this.sections.propulsion.popup; }
  setHost(host: SidePanelHost): void { this.hostValue = host; }
  setFittingPopup(popup: FittingPopupControl): void { this.fittingPopup = popup; }
  setFittingPreview(preview: FittingPreviewControl): void { this.fittingPreview = preview; }
  setFittingTriggerEnabled(enabled: boolean): void { this.fittingPopup?.setTriggerEnabled(enabled); }
  setImporter(importer: SideImporter): void { this.importerValue = importer; }
  stateFrom(settings: UserSettings): SidePanelState { return stateSliceOf(settings, this.side); }
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
      overrides: this.side === "attacker" ? {} : this.overridesValue,
      fittedHull: this.fittedHull,
      sig: this.side === "target" && this.els.targetSig !== undefined ? Math.max(num(this.els.targetSig), 1) : undefined,
    };
  }

  restore(state: SidePanelState): void {
    this.fittingText = state.fitting;
    this.overridesValue = this.side === "attacker" ? {} : state.overrides;
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

  isOverridden(key: keyof ProfileParamOverrides): boolean {
    if (this.side === "attacker" && this.turretOverrides) return this.turretOverrides.get()[key] !== undefined;
    return this.overridesValue[key] !== undefined;
  }

  recordOverride<K extends keyof ProfileParamOverrides>(key: K, value: ProfileParamOverrides[K]): void {
    if (this.side === "attacker" && this.turretOverrides) {
      const patch: Partial<ProfileParamOverrides> = { [key]: value };
      this.turretOverrides.set(patch);
    } else {
      this.overridesValue[key] = value;
    }
  }

  clearOverrides(): void {
    if (this.side === "attacker" && this.turretOverrides) {
      this.turretOverrides.clear();
    } else {
      this.overridesValue = {};
    }
  }

  clearTurret(): void {
    if (this.side === "attacker" && this.turret) {
      this.popupGroup.close(this.turret.popup);
      this.turret.clear();
    }
  }

  restoreTurret(): void {
    if (this.side === "attacker" && this.turret) {
      this.turret.restore(this.fittingText, this.skillConditions());
    }
  }

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
