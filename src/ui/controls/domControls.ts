import {
  type AutopilotMode,
  type EngagementFrame,
  type HitChanceBreakdown,
  type ShipConfig,
  type SimConfig,
  SIG_RESOLUTIONS,
  type TurretSpec,
} from "../../sim";
import { isAutopilotMode, type UserSettings } from "../settings";
import type { Els } from "./elementsContract";
import { num } from "./controlsDom";
import { AGGRESSIVITY_MIN, parseManeuverAggressivity } from "./controlsFormat";
import type { Controls, ControlsCallbacks } from "./controlsContract";
import type { DomControlsDeps, DomControlsHost } from "./domControlsContract";
import { DomControlsFactory } from "./domControlsFactory";
import type { FittingPopupController, FittingPreviewManager, Popup, PopupGroup } from "./popup";
import type { HintRotator } from "./hints";
import type { EventRouter, HullDatalist, LanguageRefresh, SessionCodec } from "./session";
import type { PreferencesController } from "./preferencesController";
import type { ProfileController } from "./profileController";
import type { EngagementReadout } from "./engagementReadout";
import type { ChoiceGroup } from "./choiceGroup";
import type { Side, SidePanel } from "./sidePanel";
import type { TurretController } from "./turret";
import type { ImportController } from "./import";

export type { Controls, ControlsCallbacks } from "./controlsContract";

export class DomControls implements Controls, DomControlsHost {
  private readonly deps: DomControlsDeps;
  private readonly els: Els;
  private readonly popupGroup: PopupGroup;
  private readonly hintRotator: HintRotator;
  private readonly hullDatalist: HullDatalist;
  private readonly preferencesController: PreferencesController;
  private readonly profileController: ProfileController;
  private readonly engagementReadout: EngagementReadout;
  private readonly sigResChoice: ChoiceGroup;
  private readonly attackerSide: SidePanel;
  private readonly targetSide: SidePanel;
  private readonly attackerAmmoPopup: Popup;
  private readonly turretController: TurretController;
  private readonly sessionCodec: SessionCodec;
  private readonly importController: ImportController;
  private readonly previewManager: FittingPreviewManager;
  private readonly attackerFittingPopup: FittingPopupController;
  private readonly targetFittingPopup: FittingPopupController;
  private readonly languageRefresh: LanguageRefresh;
  private readonly eventRouter: EventRouter;
  private callbacks?: ControlsCallbacks;
  private playing = false;

  constructor(deps: DomControlsDeps) {
    const parts = new DomControlsFactory().buildParts(deps, this);
    this.deps = parts.deps;
    this.els = parts.els;
    this.popupGroup = parts.popupGroup;
    this.hintRotator = parts.hintRotator;
    this.hullDatalist = parts.hullDatalist;
    this.preferencesController = parts.preferencesController;
    this.profileController = parts.profileController;
    this.engagementReadout = parts.engagementReadout;
    this.sigResChoice = parts.sigResChoice;
    this.attackerSide = parts.attackerSide;
    this.targetSide = parts.targetSide;
    this.attackerAmmoPopup = parts.attackerAmmoPopup;
    this.turretController = parts.turretController;
    this.sessionCodec = parts.sessionCodec;
    this.importController = parts.importController;
    this.previewManager = parts.previewManager;
    this.attackerFittingPopup = parts.attackerFittingPopup;
    this.targetFittingPopup = parts.targetFittingPopup;
    this.languageRefresh = parts.languageRefresh;
    this.eventRouter = parts.eventRouter;
    this.wireControls();
    this.sessionCodec.restoreStartup(this.deps.settingsStore.loadStartupState());
    this.attackerSide.updateAlignTime();
    this.targetSide.updateAlignTime();
  }

  private wireControls(): void {
    this.attackerSide.setFittingPopup(this.attackerFittingPopup);
    this.targetSide.setFittingPopup(this.targetFittingPopup);
    this.attackerSide.setFittingPreview(this.previewManager);
    this.targetSide.setFittingPreview(this.previewManager);
    this.popupGroup.register(this.attackerFittingPopup.popup);
    this.popupGroup.register(this.targetFittingPopup.popup);
    this.popupGroup.register(this.importController.popup);
    this.popupGroup.register(this.attackerAmmoPopup);
    this.hullDatalist.populate();
    this.attackerSide.renderSkillOptions();
    this.targetSide.renderSkillOptions();
  }

  isPlaying(): boolean { return this.playing; }

  onPlayPause(): void { this.callbacks?.onPlayPause(); }
  onReset(): void { this.callbacks?.onReset(); }
  onSpeedChange(speed: number): void { this.callbacks?.onSpeedChange(speed); }
  onConfigChange(): void {
    this.preferencesController.savePreferences();
    this.profileController.updateDirtyState();
    this.callbacks?.onConfigChange();
  }
  onDisplayChange(): void {
    this.preferencesController.savePreferences();
    this.profileController.updateDirtyState();
    this.callbacks?.onDisplayChange();
  }

  fireConfigChange(): void { this.callbacks?.onConfigChange(); }
  fireDisplayChange(): void { this.callbacks?.onDisplayChange(); }

  onProfileLoaded(name: string): void {
    const profile = this.deps.settingsStore.loadProfile(name);
    if (!profile) return;
    this.sessionCodec.restore(this.sessionCodec.fromProfile(profile), name);
    this.callbacks?.onReset();
  }

  onProfileTextLoaded(settings: UserSettings): void {
    this.sessionCodec.restore(settings);
    this.profileController.showStatus("status.profileImported");
    this.callbacks?.onReset();
  }

  captureSettings(): UserSettings { return this.sessionCodec.capture(); }

  persistConfigChange(notify = true): void {
    this.preferencesController.savePreferences();
    this.profileController.updateDirtyState();
    if (notify) this.callbacks?.onConfigChange();
  }

  getTurret(): TurretSpec { return this.turretController.currentTurretSpec(this.preferencesController.trackingInput.rad); }
  getTargetSig(): number { return num(this.els.targetSig); }
  getConfig(): SimConfig {
    const initialDistance = Math.max(num(this.els.initialDistance), 1);
    const aggressivity = parseManeuverAggressivity(this.els.maneuverAggressivity);
    const attacker: ShipConfig = {
      id: "attacker", maxSpeed: num(this.els.attackerSpeed), mass: num(this.els.attackerMass),
      inertiaModifier: num(this.els.attackerInertia), mode: this.currentMode("attacker"),
      desiredRange: num(this.els.attackerRange), aggressivity, orbitDirection: "cw",
    };
    const target: ShipConfig = {
      id: "target", maxSpeed: num(this.els.targetSpeed), mass: num(this.els.targetMass),
      inertiaModifier: num(this.els.targetInertia), mode: this.currentMode("target"),
      desiredRange: num(this.els.targetRange), aggressivity: AGGRESSIVITY_MIN, orbitDirection: "cw",
    };
    return { attacker, target, initialDistance };
  }
  getSpeed(): number { return this.preferencesController.getSpeed(); }
  getGridBrightness(): number { return this.preferencesController.getGridBrightness(); }
  update(frame: EngagementFrame, hit: HitChanceBreakdown): void {
    this.engagementReadout.update(frame, hit, (key) => this.deps.i18n.t(key));
  }
  setPlaying(playing: boolean): void {
    this.playing = playing;
    this.els.play.textContent = this.deps.i18n.t(playing ? "button.pause" : "button.play");
  }
  setCallbacks(callbacks: ControlsCallbacks): void { this.callbacks = callbacks; }
  private currentSigResolution(): number { return SIG_RESOLUTIONS[this.turretController.currentSigResClass()]; }
  private currentMode(side: Side): AutopilotMode {
    const value = this.els[`${side}Mode`].value;
    if (!isAutopilotMode(value)) throw new Error(`Invalid autopilot mode: ${value}`);
    return value;
  }
}
