import type { ShipProfile, Ships, StatConditions } from "../../../ships";
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
import type { PanelOverrides } from "./overrides";
import type { PanelTurretLink } from "./turretLink";
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
  ewarFittedCount() { return 0; },
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
  private readonly overrides: PanelOverrides;
  private readonly turretLink: PanelTurretLink;
  private hostValue: SidePanelHost = NOOP_HOST;
  private profileValue?: ShipProfile;
  private fittedHullValue?: FittedHullSummary;
  private fittingTextValue?: string;
  private lastCommittedHullValue?: string;
  private importerValue?: SideImporter;
  readonly sections: ISidePanelSections;
  private fittingPopup?: FittingPopupControl;
  private fittingPreview?: FittingPreviewControl;

  constructor(deps: SidePanelDeps) {
    const { side, popupGroup, els, i18n, ships, fittingImport, imageCatalog, timer, events, overrides, turretLink } = deps;
    this.side = side;
    this.popupGroup = popupGroup;
    this.els = els;
    this.i18n = i18n;
    this.ships = ships;
    this.fittingImport = fittingImport;
    this.imageCatalog = imageCatalog;
    this.timer = timer;
    this.overrides = overrides;
    this.turretLink = turretLink;
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
      this.sections.propulsion.renderPropulsionOptions();
      this.sections.paste.clearImportHint();
      this.sections.hull.refreshHullInputs();
      this.sections.hull.updateHullHint();
      this.sections.skill.renderSkillOptions();
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
  setConfigInputsEnabled(enabled: boolean): void {
    const { els } = this;
    els.speed.disabled = !enabled;
    els.mass.disabled = !enabled;
    els.inertia.disabled = !enabled;
    els.mode.disabled = !enabled;
    els.range.disabled = !enabled;
    if (els.targetSig !== undefined) els.targetSig.disabled = !enabled;
    els.skills.disabled = !enabled;
    this.setButtonDisabled(els.skillTrigger, enabled);
    els.overload.disabled = !enabled;
    this.setButtonDisabled(els.overloadButton, enabled);
    for (const child of els.skillOptions.children) (child as HTMLButtonElement).disabled = !enabled;
    if (enabled) this.sections.skill.setOverloadDisabled();
  }
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
      propulsion: this.sections.propulsion.currentPropulsionSelection(),
      fitting: this.fittingText,
      overrides: this.overrides.get(),
      fittedHull: this.fittedHull,
      sig: this.side === "target" && this.els.targetSig !== undefined ? Math.max(num(this.els.targetSig), 1) : undefined,
    };
  }

  restore(state: SidePanelState): void {
    this.fittingText = state.fitting ? this.fittingImport.canonicalEftText(state.fitting) ?? state.fitting : state.fitting;
    this.overrides.set(state.overrides);
    this.els.speed.value = formatNumber(state.speed);
    this.els.mass.value = String(state.mass);
    this.els.inertia.value = formatNumber(state.inertia, 6);
    this.els.mode.value = state.mode;
    this.els.range.value = String(state.range);
    this.sections.hull.loadHull(state.hull, state.propulsion);
    this.sections.skill.setSkillLevel(state.skillLevel ?? 5);
    this.sections.skill.setOverloadActive(state.overload ?? true);
    this.sections.skill.setOverloadDisabled();
    if (state.fittedHull) this.sections.hull.restoreFittingSummary(state.fittedHull);
    if (this.els.targetSig !== undefined && state.sig !== undefined) this.els.targetSig.value = String(state.sig);
    this.sections.stats.updateAlignTime();
  }

  private setButtonDisabled(button: HTMLButtonElement, enabled: boolean): void {
    button.disabled = !enabled;
    button.setAttribute("aria-disabled", String(!enabled));
  }

  private currentMode(): AutopilotMode {
    const value = this.els.mode.value;
    if (!isAutopilotMode(value)) throw new Error(`Invalid autopilot mode: ${value}`);
    return value;
  }

  isOverridden(key: keyof ProfileParamOverrides): boolean {
    return this.overrides.isOverridden(key);
  }

  recordOverride<K extends keyof ProfileParamOverrides>(key: K, value: ProfileParamOverrides[K]): void {
    this.overrides.record(key, value);
  }

  clearOverrides(): void {
    this.overrides.clear();
  }

  clearTurret(): void {
    this.turretLink.clear();
  }

  restoreTurret(): void {
    this.turretLink.restore(this.fittingText, this.skillConditions());
  }

  setTurretProfile(profile: ShipProfile | undefined): void {
    this.turretLink.setHullProfile(profile);
  }

  skillConditions(): StatConditions { return this.sections.skill.skillConditions(); }
}
