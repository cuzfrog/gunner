import type { ShipProfile, Ships, StatConditions } from "../../../ships";
import type { ShipId } from "../../../gamedata/ids";
import type { FittingImport } from "../../../fitting";
import type { AutopilotMode, SensorSpec } from "../../../sim";
import {
  type FittedHullSummary,
  type ProfileParamOverrides,
  type PropulsionSelection,
} from "../../../appstate";
import { num } from "../controlsDom";
import { formatNumber } from "../controlsFormat";
import type { I18n } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { Timer } from "../../timer";
import type { UiEvents } from "../../events";
import type { Popup, PopupGroup } from "../popup";
import type { SidePanelElements } from "./elements";
import { HullSection } from "./hullSection";
import { NavSection } from "./navSection";
import { PasteImportSection } from "./pasteImportSection";
import { PropulsionSection } from "./propulsionSection";
import { SkillOverloadSection } from "./skillOverloadSection";
import { StatsSection } from "./statsSection";
import type { Side } from "../side";
import type { PanelOverrides } from "./overrides";
import type { PanelTurretLink } from "./turretLink";
import type { PanelLauncherLink } from "./launcherLink";
import type { PanelDroneLink } from "./droneLink";
import {
  type FittingPopupControl,
  type FittingPreviewControl,
  type SideImporter,
  type SidePanel,
  type SidePanelDeps,
  type SidePanelHost,
  type SidePanelState,
} from "./sidePanelContract";
import type { ISidePanelSections } from "./sidePanelSections";
import type { SelectionSession } from "../../selectionSession";

const SHIP_INPUT_OVERRIDE_KEYS: Record<Side, Record<"speed" | "mass" | "inertia", keyof ProfileParamOverrides>> = {
  shipA: { speed: "shipASpeed", mass: "shipAMass", inertia: "shipAInertia" },
  shipB: { speed: "shipBSpeed", mass: "shipBMass", inertia: "shipBInertia" },
} as const;

const NOOP_HOST: SidePanelHost = {
  persistConfigChange() {},
  onConfigChange() {},
  onDisplayChange() {},
};

export class SidePanelImpl implements SidePanel {
  readonly side: Side;
  get host(): SidePanelHost { return this.hostValue; }
  readonly els: SidePanelElements;
  readonly ships: Ships;
  readonly fittingImport: FittingImport;
  private readonly imageCatalog: ImageCatalog;
  readonly i18n: I18n;
  readonly timer: Timer;
  private readonly popupGroup: PopupGroup;
  private readonly overrides: PanelOverrides;
  private readonly turretLink: PanelTurretLink;
  private readonly launcherLink: PanelLauncherLink;
  private readonly droneLink: PanelDroneLink;
  private readonly selectionSession: SelectionSession;
  private hostValue: SidePanelHost = NOOP_HOST;
  private profileValue?: ShipProfile;
  private fittedHullValue?: FittedHullSummary;
  private fittingTextValue?: string;
  private lastCommittedHullValue?: ShipId;
  private importerValue?: SideImporter;
  private sensorSpecValue?: SensorSpec;
  readonly sections: ISidePanelSections;
  private fittingPopup?: FittingPopupControl;
  private fittingPreview?: FittingPreviewControl;

  constructor(deps: SidePanelDeps) {
    const { side, popupGroup, els, i18n, ships, fittingImport, imageCatalog, timer, events, overrides, turretLink, launcherLink, droneLink, simValueParser, propulsionSelection, selectionSession } = deps;
    this.selectionSession = selectionSession;
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
    this.launcherLink = launcherLink;
    this.droneLink = droneLink;
    const hull = new HullSection({ panel: this, els, ships, i18n });
    const nav = new NavSection({ panel: this, els, simValueParser });
    const stats = new StatsSection({ panel: this, els, ships, i18n });
    const skill = new SkillOverloadSection({ panel: this, els, i18n, popupGroup });
    const propulsion = new PropulsionSection({ panel: this, els, ships, fittingImport, imageCatalog, i18n, popupGroup, propulsionSelection });
    const paste = new PasteImportSection({ panel: this, els, i18n, timer });
    this.sections = { hull, nav, stats, skill, propulsion, paste };
    this.els.speed.addEventListener("input", () => this.onShipInput("speed"));
    this.els.mass.addEventListener("input", () => this.onShipInput("mass"));
    this.els.inertia.addEventListener("input", () => this.onShipInput("inertia"));
    this.els.shipSig.addEventListener("input", () => this.onShipSigInput());
    popupGroup.register(skill.popup);
    popupGroup.register(paste.popup);
    popupGroup.register(propulsion.popup);
    events.onLanguageChanged(() => {
      this.sections.propulsion.renderPropulsionOptions();
      this.sections.paste.clearImportHint();
      this.sections.hull.refreshHullInputs();
      this.sections.hull.updateHullHint();
      this.sections.skill.renderSkillOptions();
      this.sections.skill.renderDefenseSkills();
      this.sections.skill.renderTargetingSkills();
    });
  }

  get profile(): ShipProfile | undefined { return this.profileValue; }
  set profile(value: ShipProfile | undefined) { this.profileValue = value; }
  get fittedHull(): FittedHullSummary | undefined { return this.fittedHullValue; }
  set fittedHull(value: FittedHullSummary | undefined) { this.fittedHullValue = value; }
  get fittingText(): string | undefined { return this.fittingTextValue; }
  set fittingText(value: string | undefined) { this.fittingTextValue = value; }
  get lastCommittedHull(): ShipId | undefined { return this.lastCommittedHullValue; }
  set lastCommittedHull(value: ShipId | undefined) { this.lastCommittedHullValue = value; }
  setSensorData(spec: SensorSpec | undefined): void {
    this.sensorSpecValue = spec;
  }
  get importer(): SideImporter {
    if (!this.importerValue) throw new Error("SidePanel importer not set");
    return this.importerValue;
  }

  getSkillPopup(): Popup { return this.sections.skill.popup; }
  getPastePopup(): Popup { return this.sections.paste.popup; }
  getPropulsionVariantPopup(): Popup { return this.sections.propulsion.popup; }
  setHost(host: SidePanelHost): void { this.hostValue = host; }

  private onShipInput(key: "speed" | "mass" | "inertia"): void {
    const value = num(this.els[key]);
    const overrideKey = SHIP_INPUT_OVERRIDE_KEYS[this.side][key];
    this.recordOverride(overrideKey, value);
    if (key === "mass") {
      this.sections.stats.updateSpeedFromMass();
      this.sections.stats.updateAlignTime();
    }
    if (key === "inertia") this.sections.stats.updateAlignTime();
    this.host.onConfigChange();
  }

  private onShipSigInput(): void {
    const sigKey = this.side === "shipA" ? "shipASig" : "shipBSig";
    this.recordOverride(sigKey, this.capture().sig ?? 1);
    this.host.onDisplayChange();
  }

  setFittingPopup(popup: FittingPopupControl): void { this.fittingPopup = popup; }
  setFittingPreview(preview: FittingPreviewControl): void { this.fittingPreview = preview; }
  setFittingEyeEnabled(enabled: boolean): void { this.fittingPopup?.setFittingEyeEnabled(enabled); }
  setConfigInputsEnabled(enabled: boolean): void {
    const { els } = this;
    els.speed.disabled = !enabled;
    els.mass.disabled = !enabled;
    els.inertia.disabled = !enabled;
    this.els.shipSig.disabled = !enabled;
    this.sections.nav.setEnabled(enabled);
    els.skills.disabled = !enabled;
    this.setButtonDisabled(els.skillTrigger, enabled);
    els.overload.disabled = !enabled;
    this.setButtonDisabled(els.overloadButton, enabled);
    for (const child of els.skillOptions.children) (child as HTMLButtonElement).disabled = !enabled;
    if (enabled) this.sections.skill.setOverloadDisabled();
  }

  setImporter(importer: SideImporter): void { this.importerValue = importer; }
  renderFittingPopupIfOpen(): void { this.fittingPopup?.renderIfOpen(); }
  closeFittingPopupIfOpen(): void { this.fittingPopup?.closeIfOpen(); }
  hideFittingPreview(): void { this.fittingPreview?.hide(this.side); }

  capture(): SidePanelState {
    const nav = this.sections.nav.capture();
    return {
      speed: num(this.els.speed),
      baseMaxSpeed: this.sections.stats.currentBaseMaxSpeed(),
      mass: num(this.els.mass),
      inertia: num(this.els.inertia),
      ...nav,
      skillLevel: this.sections.skill.currentSkillLevel(),
      defenseSkills: this.sections.skill.currentDefenseSkills(),
      targetingSkills: this.sections.skill.currentTargetingSkills(),
      overload: this.els.overload.checked,
      weaponOverload: this.sections.skill.isWeaponOverloaded(),
      hull: this.profile?.id,
      propulsion: this.sections.propulsion.currentPropulsionSelection(),
      fitting: this.fittingText,
      overrides: this.overrides.get(),
      fittedHull: this.fittedHull,
      sig: Math.max(num(this.els.shipSig), 1),
      sigBloomFactor: this.sections.stats.currentSigBloomFactor(),
      sensorSpec: this.sensorSpecValue,
    };
  }

  restore(state: SidePanelState): void {
    this.fittingText = state.fitting ? this.fittingImport.canonicalEftText(state.fitting) ?? state.fitting : state.fitting;
    this.overrides.set(state.overrides);
    this.els.speed.value = formatNumber(state.speed);
    this.els.mass.value = String(state.mass);
    this.els.inertia.value = formatNumber(state.inertia, 6);
    this.sections.nav.restore({ mode: state.mode, range: state.range, aggressivity: state.aggressivity });
    this.sections.hull.loadHull(state.hull, state.propulsion);
    this.sections.skill.setSkillLevel(state.skillLevel ?? 5);
    if (state.defenseSkills) this.sections.skill.setDefenseSkills(state.defenseSkills);
    else this.sections.skill.resetDefenseSkills();
    if (state.targetingSkills) this.sections.skill.setTargetingSkills(state.targetingSkills);
    else this.sections.skill.resetTargetingSkills();
    this.sections.skill.setOverloadActive(state.overload);
    this.sections.skill.setWeaponOverloaded(state.weaponOverload);
    this.sections.skill.setOverloadDisabled();
    if (state.fittedHull) this.sections.hull.restoreFittingSummary(state.fittedHull);
    if (state.sig !== undefined) this.els.shipSig.value = String(state.sig);
    this.sections.stats.updateShipStats({ updateInertia: true, updateMass: false, updateSig: true });
    this.sections.stats.updateAlignTime();
  }

  private setButtonDisabled(button: HTMLButtonElement, enabled: boolean): void {
    button.disabled = !enabled;
    button.setAttribute("aria-disabled", String(!enabled));
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

  clearLauncher(): void {
    this.launcherLink.clear();
  }

  restoreLauncher(): void {
    this.launcherLink.restore(this.fittingText, this.skillConditions());
  }

  setLauncherProfile(profile: ShipProfile | undefined): void {
    this.launcherLink.setHullProfile(profile);
  }

  clearDrone(): void {
    this.droneLink.clear();
  }

  restoreDrone(): void {
    this.droneLink.restore(this.fittingText, this.skillConditions());
  }

  clearSelectionSession(): void {
    this.selectionSession.clear();
  }

  skillConditions(): StatConditions { return this.sections.skill.skillConditions(); }
}
