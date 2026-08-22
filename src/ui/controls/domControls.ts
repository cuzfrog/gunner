import type { Ships } from "../../ships";
import { type AutopilotMode, type EngagementFrame, type HitChance, type HitChanceBreakdown, type ShipConfig, type SimConfig, SIG_RESOLUTIONS, type TurretSpec } from "../../sim";
import { type ChargeCatalog, type FittingImport, type GunFamilies, type PresetFittings } from "../../fitting";
import type { I18n } from "../i18n";
import type { ImageCatalog } from "../icons";
import type { SavedFittings } from "../settings";
import { DomFittingPreview } from "./fittingPreview";
import { PreferencesController } from "./preferencesController";
import { ProfileController } from "./profileController";
import { TurretController } from "./turretController";
import { TurretStateResolver } from "./turretStateResolver";
import { FittingPreviewManager } from "./fittingPreviewManager";
import { ImportController } from "./importController";
import { HintRotator, type IHintRotator } from "./hintRotator";
import { HINT_CANDIDATES, LORES, TIP_TEXT } from "./hints";
import type { Timer } from "../timer";
import { createControlsEls } from "./createElements";
import type { Els } from "./elements";
import { el, num } from "./controlsDom";
import { SidePanel, type Side, collectSideEls } from "./sidePanel";
import { PopupGroup } from "./popupGroup";
import { ChoiceGroup } from "./choiceGroup";
import { EngagementReadout } from "./engagementReadout";
import { SessionCodec } from "./sessionCodec";
import { AGGRESSIVITY_MIN, isAutopilotMode, parseManeuverAggressivity, profileSettingsOf } from "./controlsFormat";
import { collectPreferencesEls, collectProfileEls, collectTurretEls, collectImportEls, collectFittingPopupEls } from "./elementSlices";
import { FittingPopupController } from "./fittingPopupController";
import { EventRouter, type EventRouterHost } from "./eventRouter";
import { LanguageRefresh } from "./languageRefresh";
import { populateHullDatalist, updateFittingTrigger } from "./hullDatalist";
import { currentSigResValue } from "./inputState";
import { setInitialDefaults } from "./sessionDefaults";
import type { ClipboardProvider, SettingsStore, UserSettings } from "../settings";

export interface ControlsCallbacks {
  readonly onReset: () => void;
  readonly onConfigChange: () => void;
  readonly onDisplayChange: () => void;
  readonly onPlayPause: () => void;
  readonly onSpeedChange: (speed: number) => void;
}

export interface Controls {
  getTurret(): TurretSpec;
  getTargetSig(): number;
  getConfig(): SimConfig;
  getSpeed(): number;
  getGridBrightness(): number;
  update(frame: EngagementFrame, hit: HitChanceBreakdown): void;
  setPlaying(playing: boolean): void;
  setCallbacks(callbacks: ControlsCallbacks): void;
}

export class DomControls implements Controls, EventRouterHost {
  private readonly els: Els;
  private readonly hitChance: HitChance;
  private readonly i18n: I18n;
  private readonly settingsStore: SettingsStore;
  private readonly ships: Ships;
  private readonly fittingImport: FittingImport;
  private readonly gunFamilies: GunFamilies;
  private readonly presetFittings: PresetFittings;
  private readonly savedFittings: SavedFittings;
  private readonly clipboard: ClipboardProvider;
  private readonly timer: Timer;
  private readonly chargeCatalog: ChargeCatalog;
  private readonly imageCatalog: ImageCatalog;
  private readonly preferencesController: PreferencesController;
  private readonly profileController: ProfileController;
  private readonly hintRotator: IHintRotator;
  private readonly previewManager: FittingPreviewManager;
  private readonly attackerFittingPopup: FittingPopupController;
  private readonly targetFittingPopup: FittingPopupController;
  private callbacks?: ControlsCallbacks;
  private playing = false;
  private readonly popupGroup: PopupGroup;
  private readonly attackerSide: SidePanel;
  private readonly targetSide: SidePanel;
  private readonly attackerAmmoPopup: { isOpen: () => boolean; open: () => void; close: () => void; focusTrigger: () => void; contains: (target: EventTarget) => boolean };
  private readonly importController: ImportController;
  private readonly engagementReadout: EngagementReadout;
  private readonly sigResChoice: ChoiceGroup;
  private readonly turretController: TurretController;
  private readonly sessionCodec: SessionCodec;
  private readonly eventRouter: EventRouter;

  constructor({ hitChance, i18n, settingsStore, ships, fittingImport, gunFamilies, presetFittings, savedFittings, clipboard, timer, chargeCatalog, imageCatalog }: { hitChance: HitChance; i18n: I18n; settingsStore: SettingsStore; ships: Ships; fittingImport: FittingImport; gunFamilies: GunFamilies; presetFittings: PresetFittings; savedFittings: SavedFittings; clipboard: ClipboardProvider; timer: Timer; chargeCatalog: ChargeCatalog; imageCatalog: ImageCatalog }) {
    this.hitChance = hitChance;
    this.i18n = i18n;
    this.settingsStore = settingsStore;
    this.ships = ships;
    this.fittingImport = fittingImport;
    this.gunFamilies = gunFamilies;
    this.presetFittings = presetFittings;
    this.savedFittings = savedFittings;
    this.clipboard = clipboard;
    this.timer = timer;
    this.chargeCatalog = chargeCatalog;
    this.imageCatalog = imageCatalog;
    this.popupGroup = new PopupGroup();
    this.hintRotator = new HintRotator({ element: el("slide-hints"), i18n, candidates: HINT_CANDIDATES, tipText: TIP_TEXT, lores: LORES, timer, intervalMs: 20_000 });
    this.els = createControlsEls();
    this.preferencesController = new PreferencesController({ els: collectPreferencesEls(this.els), i18n: this.i18n, settingsStore: this.settingsStore, sigResolution: () => this.currentSigResolution(), onLanguageChanged: () => this.languageRefresh.refresh(this.playing) });
    this.profileController = new ProfileController({ els: collectProfileEls(this.els), settingsStore: this.settingsStore, timer: this.timer, i18n: this.i18n, captureCurrent: () => profileSettingsOf(this.sessionCodec.capture()), onLoaded: (name) => this.onProfileLoaded(name) });
    this.engagementReadout = new EngagementReadout({ resDistance: el("res-distance"), resTransversal: el("res-transversal"), resAngular: el("res-angular"), resRadial: el("res-radial"), resTrackPen: el("res-track-pen"), resRangePen: el("res-range-pen"), resHit: el("res-hit") });
    this.sigResChoice = new ChoiceGroup(this.els.sigResOptions, this.els.sigRes, ["S", "M", "L", "XL"]);
    this.attackerSide = new SidePanel({ side: "attacker", host: this.createSidePanelHost("attacker"), popupGroup: this.popupGroup, els: collectSideEls(this.els, "attacker"), i18n: this.i18n, ships: this.ships, fittingImport: this.fittingImport, imageCatalog: this.imageCatalog, timer: this.timer });
    this.targetSide = new SidePanel({ side: "target", host: this.createSidePanelHost("target"), popupGroup: this.popupGroup, els: collectSideEls(this.els, "target"), i18n: this.i18n, ships: this.ships, fittingImport: this.fittingImport, imageCatalog: this.imageCatalog, timer: this.timer });
    this.attackerAmmoPopup = { isOpen: () => this.turretController.isAmmoPopupOpen(), open: () => this.turretController.openAmmoPopup(), close: () => this.turretController.closeAmmoPopup(), focusTrigger: () => this.els.attackerAmmoTrigger.focus(), contains: (target) => target instanceof Element && target.closest("#attacker-ammo-field") !== null };
    this.turretController = new TurretController({
      els: collectTurretEls(this.els), popup: this.attackerAmmoPopup, chargeCatalog: this.chargeCatalog, gunFamilies: this.gunFamilies, imageCatalog: this.imageCatalog,
      trackingInput: this.preferencesController.trackingInput, i18n: this.i18n, fittingImport: this.fittingImport,
      resolver: new TurretStateResolver({ chargeCatalog: this.chargeCatalog, fittingImport: this.fittingImport }),
      overrides: () => this.attackerSide.overrides, clearTurretOverrides: () => { delete this.attackerSide.overrides.tracking; delete this.attackerSide.overrides.sigRes; delete this.attackerSide.overrides.optimal; delete this.attackerSide.overrides.falloff; },
      onConfigChange: (persist) => { this.preferencesController.savePreferences(); if (persist) this.profileController.updateDirtyState(); this.callbacks?.onConfigChange(); },
    });
    this.sessionCodec = new SessionCodec({ els: this.els, attackerSide: this.attackerSide, targetSide: this.targetSide, turret: this.turretController, preferences: this.preferencesController, profileController: this.profileController, i18n: this.i18n, chargeCatalog: this.chargeCatalog, sigResChoice: this.sigResChoice, hintRotator: this.hintRotator, settingsStore: this.settingsStore, isPlaying: () => this.playing, setPlaying: (playing: boolean) => this.setPlaying(playing), onSetInitialDefaults: () => setInitialDefaults({ els: this.els, hitChance: this.hitChance, attackerSide: this.attackerSide, targetSide: this.targetSide, turretController: this.turretController, preferencesController: this.preferencesController, profileController: this.profileController, setPlaying: (playing: boolean) => this.setPlaying(playing) }) });
    this.importController = new ImportController({ clipboard: this.clipboard, fittingImport: this.fittingImport, savedFittings: this.savedFittings, popupGroup: this.popupGroup, els: collectImportEls(this.els), sidePanel: (side) => this.side(side), turret: this.turretController, preferences: this.preferencesController, profileController: this.profileController, getSettings: () => this.sessionCodec.capture(), onConfigPersisted: () => this.onConfigPersisted(), onProfileTextLoaded: (settings) => this.onProfileTextLoaded(settings) });
    const attackerPreview = new DomFittingPreview({ container: this.els.attackerFittingPreview, i18n: this.i18n, imageCatalog: this.imageCatalog, viewport: () => window });
    const targetPreview = new DomFittingPreview({ container: this.els.targetFittingPreview, i18n: this.i18n, imageCatalog: this.imageCatalog, viewport: () => window });
    this.previewManager = new FittingPreviewManager({ fittingImport: this.fittingImport, imageCatalog: this.imageCatalog, i18n: this.i18n, previewsBySide: { attacker: attackerPreview, target: targetPreview } as const, shipImageBySide: { attacker: this.els.attackerShipImage, target: this.els.targetShipImage } as const, eyeBySide: { attacker: this.els.attackerFittingEye, target: this.els.targetFittingEye } as const, profileOf: (side) => this.side(side).profile, fittingTextOf: (side) => this.side(side).fittingText });
    this.attackerFittingPopup = this.createFittingPopup("attacker");
    this.targetFittingPopup = this.createFittingPopup("target");
    this.languageRefresh = new LanguageRefresh({ i18n: this.i18n, els: this.els, presetFittings: this.presetFittings, profileController: this.profileController, attackerSide: this.attackerSide, targetSide: this.targetSide, turretController: this.turretController, attackerFittingPopup: this.attackerFittingPopup, targetFittingPopup: this.targetFittingPopup, previewManager: this.previewManager, hintRotator: this.hintRotator, setPlaying: (playing: boolean) => this.setPlaying(playing), onDisplayChange: () => this.callbacks?.onDisplayChange() });
    this.attackerSide.setFittingPopup(this.attackerFittingPopup);
    this.targetSide.setFittingPopup(this.targetFittingPopup);
    this.attackerSide.setFittingPreview(this.previewManager);
    this.targetSide.setFittingPreview(this.previewManager);
    this.popupGroup.register(this.attackerFittingPopup.popup);
    this.popupGroup.register(this.targetFittingPopup.popup);
    this.popupGroup.register(this.importController.popup);
    this.popupGroup.register(this.attackerAmmoPopup);
    populateHullDatalist(this.els, this.presetFittings);
    this.attackerSide.renderSkillOptions();
    this.targetSide.renderSkillOptions();
    this.sessionCodec.restoreStartup(this.settingsStore.loadStartupState());
    this.eventRouter = new EventRouter({ els: this.els, preferences: this.preferencesController, profile: this.profileController, import: this.importController, attackerSide: this.attackerSide, targetSide: this.targetSide, turret: this.turretController, popupGroup: this.popupGroup, previewManager: this.previewManager, attackerAmmoPopup: this.attackerAmmoPopup, attackerFittingPopup: this.attackerFittingPopup, targetFittingPopup: this.targetFittingPopup, host: this });
    this.attackerSide.updateAlignTime();
    this.targetSide.updateAlignTime();
  }

  private side(side: Side): SidePanel { return side === "attacker" ? this.attackerSide : this.targetSide; }

  private fittingPopupDeps(side: Side): FittingPopupSharedDeps {
    return {
      popupGroup: this.popupGroup, savedFittings: this.savedFittings, presetFittings: this.presetFittings,
      fittingImport: this.fittingImport, imageCatalog: this.imageCatalog, i18n: this.i18n,
      panelFor: (side) => this.side(side), previews: this.previewManager,
    };
  }
  private createFittingPopup(side: Side): FittingPopupController {
    return new FittingPopupController({
      side,
      ...this.fittingPopupDeps(side),
      els: collectFittingPopupEls(this.els, side),
      applyFitting: (text) => this.importController.importEftFitting(side, text, true),
    });
  }

  private languageRefresh!: LanguageRefresh;

  private createSidePanelHost(side: Side) {
    return {
      updateFittingTrigger: (enabled: boolean) => updateFittingTrigger(this.els, side, enabled),
      persistConfigChange: (notify = true) => this.persistConfigChange(notify),
      attackerTurretHooks: side === "attacker" ? {
        onFittedHullCleared: () => this.onAttackerFittedHullCleared(),
        restoreTurret: () => this.turretController.restore(this.attackerSide.fittingText, this.attackerSide.skillConditions()),
      } : { onFittedHullCleared: () => {}, restoreTurret: () => {} },
      importer: {
        mostRecentFittingFor: (hullName: string) => this.savedFittings.mostRecentFor(hullName),
        importEftFitting: (text: string, persist: boolean) => this.importController.importEftFitting(side, text, persist),
        importFromText: (text: string) => this.importController.importFromText(side, text),
        importFromClipboard: () => this.importController.importFromClipboard(side),
      },
    };
  }
  private onAttackerFittedHullCleared(): void { this.popupGroup.close(this.attackerAmmoPopup); this.turretController.clear(); }
  private persistConfigChange(notify = true): void { this.preferencesController.savePreferences(); this.profileController.updateDirtyState(); if (notify) this.callbacks?.onConfigChange(); }
  private onProfileLoaded(name: string): void { const profile = this.settingsStore.loadProfile(name); if (!profile) return; this.sessionCodec.restore(this.sessionCodec.fromProfile(profile), name); this.callbacks?.onReset(); }
  private onConfigPersisted(): void { this.preferencesController.savePreferences(); this.profileController.updateDirtyState(); this.callbacks?.onConfigChange(); }
  private onProfileTextLoaded(settings: UserSettings): void { this.sessionCodec.restore(settings); this.profileController.showStatus("status.profileImported"); this.callbacks?.onReset(); }
  getTurret(): TurretSpec { return this.turretController.currentTurretSpec(this.preferencesController.trackingInput.rad); } getTargetSig(): number { return num(this.els.targetSig); }
  getConfig(): SimConfig {
    const initialDistance = Math.max(num(this.els.initialDistance), 1);
    const aggressivity = parseManeuverAggressivity(this.els.maneuverAggressivity);
    const attacker: ShipConfig = { id: "attacker", maxSpeed: num(this.els.attackerSpeed), mass: num(this.els.attackerMass), inertiaModifier: num(this.els.attackerInertia), mode: this.currentMode("attacker"), desiredRange: num(this.els.attackerRange), aggressivity, orbitDirection: "cw" };
    const target: ShipConfig = { id: "target", maxSpeed: num(this.els.targetSpeed), mass: num(this.els.targetMass), inertiaModifier: num(this.els.targetInertia), mode: this.currentMode("target"), desiredRange: num(this.els.targetRange), aggressivity: AGGRESSIVITY_MIN, orbitDirection: "cw" };
    return { attacker, target, initialDistance };
  }
  getSpeed(): number { return this.preferencesController.getSpeed(); } getGridBrightness(): number { return this.preferencesController.getGridBrightness(); }
  update(frame: EngagementFrame, hit: HitChanceBreakdown): void { this.engagementReadout.update(frame, hit, (key) => this.i18n.t(key)); }
  setPlaying(playing: boolean): void { this.playing = playing; this.els.play.textContent = this.i18n.t(playing ? "button.pause" : "button.play"); }
  setCallbacks(callbacks: ControlsCallbacks): void { this.callbacks = callbacks; }
  onPlayPause(): void { this.callbacks?.onPlayPause(); } onReset(): void { this.callbacks?.onReset(); }
  onSpeedChange(speed: number): void { this.callbacks?.onSpeedChange(speed); }
  onConfigChange(): void { this.preferencesController.savePreferences(); this.profileController.updateDirtyState(); this.callbacks?.onConfigChange(); }
  onDisplayChange(): void { this.preferencesController.savePreferences(); this.profileController.updateDirtyState(); this.callbacks?.onDisplayChange(); }
  private currentSigResolution(): number { return SIG_RESOLUTIONS[currentSigResValue(this.els)]; }
  private currentMode(side: Side): AutopilotMode {
    const value = this.els[`${side}Mode`].value;
    if (!isAutopilotMode(value)) throw new Error(`Invalid autopilot mode: ${value}`);
    return value;
  }
}

interface FittingPopupSharedDeps {
  readonly popupGroup: PopupGroup;
  readonly savedFittings: SavedFittings;
  readonly presetFittings: PresetFittings;
  readonly fittingImport: FittingImport;
  readonly imageCatalog: ImageCatalog;
  readonly i18n: I18n;
  readonly panelFor: (side: Side) => SidePanel;
  readonly previews: FittingPreviewManager;
}
