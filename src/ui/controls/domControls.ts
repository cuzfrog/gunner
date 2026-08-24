import {
  type CombatantConfig,
  type EngagementFrame,
  type EwarProjection,
  type HitChanceBreakdown,
  type SimConfig,
  type TurretSpec,
} from "../../sim";
import type { UserSettings } from "../../appstate";
import type { Els } from "./elementsContract";
import { AGGRESSIVITY_MIN } from "./controlsFormat";
import type { Controls, ControlsCallbacks, EffectiveReadouts } from "./controlsContract";
import type { DomControlsDeps, DomControlsHost } from "./domControlsContract";
import type { EffectiveReadout } from "./effectiveReadout";
import type { RangeOverlayHost } from "./rangeOverlay";
import type { FittingPopupController, FittingPreviewManager, PopupGroup } from "./popup";
import type { HintRotator } from "./hints";
import type { EventRouter, HullDatalist, SessionCodec } from "./session";
import type { PreferencesController } from "./preferencesController";
import type { ProfileController } from "./profileController";
import type { EngagementReadout } from "./engagementReadout";
import type { ChoiceGroup } from "./choiceGroup";
import type { SidePanel } from "./sidePanel";
import type { TurretController } from "./turret";
import type { EwarController } from "./ewar";
import type { BoosterController } from "./booster";
import type { ImportController } from "./import";
import type { ShareController } from "./share";
import type { RangeOverlay } from "../renderer";
import type { RangeOverlayController } from "./rangeOverlay";

export type { Controls, ControlsCallbacks } from "./controlsContract";

interface DomControlsAllDeps extends DomControlsDeps {
  els: Els;
  popupGroup: PopupGroup;
  hintRotator: HintRotator;
  hullDatalist: HullDatalist;
  preferencesController: PreferencesController;
  profileController: ProfileController;
  engagementReadout: EngagementReadout;
  effectiveReadout: EffectiveReadout;
  sigResChoice: ChoiceGroup;
  attackerSide: SidePanel;
  targetSide: SidePanel;
  turretController: TurretController;
  sessionCodec: SessionCodec;
  importController: ImportController;
  ewarController: EwarController;
  boosterController: BoosterController;
  shareController: ShareController;
  rangeOverlayController: RangeOverlayController;
  previewManager: FittingPreviewManager;
  attackerFittingPopup: FittingPopupController;
  targetFittingPopup: FittingPopupController;
  eventRouter: EventRouter;
}

export class DomControls implements Controls, DomControlsHost, RangeOverlayHost {
  private readonly deps: DomControlsDeps;
  private readonly els: Els;
  private readonly popupGroup: PopupGroup;
  private readonly hintRotator: HintRotator;
  private readonly hullDatalist: HullDatalist;
  private readonly preferencesController: PreferencesController;
  private readonly profileController: ProfileController;
  private readonly engagementReadout: EngagementReadout;
  private readonly effectiveReadout: EffectiveReadout;
  private readonly sigResChoice: ChoiceGroup;
  private readonly attackerSide: SidePanel;
  private readonly targetSide: SidePanel;
  private readonly turretController: TurretController;
  private readonly sessionCodec: SessionCodec;
  private readonly importController: ImportController;
  private readonly ewarController: EwarController;
  private readonly boosterController: BoosterController;
  private readonly shareController: ShareController;
  private readonly rangeOverlayController: RangeOverlayController;
  private readonly previewManager: FittingPreviewManager;
  private currentDistanceValue: number;
  private readonly attackerFittingPopup: FittingPopupController;
  private readonly targetFittingPopup: FittingPopupController;
  private readonly eventRouter: EventRouter;
  private callbacks?: ControlsCallbacks;
  private playing = false;

  constructor(all: DomControlsAllDeps) {
    this.deps = all;
    this.els = all.els;
    this.popupGroup = all.popupGroup;
    this.hintRotator = all.hintRotator;
    this.hullDatalist = all.hullDatalist;
    this.preferencesController = all.preferencesController;
    this.profileController = all.profileController;
    this.engagementReadout = all.engagementReadout;
    this.effectiveReadout = all.effectiveReadout;
    this.sigResChoice = all.sigResChoice;
    this.attackerSide = all.attackerSide;
    this.targetSide = all.targetSide;
    this.turretController = all.turretController;
    this.sessionCodec = all.sessionCodec;
    this.importController = all.importController;
    this.ewarController = all.ewarController;
    this.boosterController = all.boosterController;
    this.shareController = all.shareController;
    this.rangeOverlayController = all.rangeOverlayController;
    this.previewManager = all.previewManager;
    this.currentDistanceValue = this.sessionCodec.getInitialDistance();
    this.attackerFittingPopup = all.attackerFittingPopup;
    this.targetFittingPopup = all.targetFittingPopup;
    this.eventRouter = all.eventRouter;
    this.deps.events.onLanguageChanged(() => this.onLanguageChanged());
    this.deps.events.onConfigInvalidated((persist) => this.onConfigInvalidated(persist));
    this.deps.events.onDisplayInvalidated(() => this.onDisplayChange());
  }

  wireControls(): void {
    this.popupGroup.register(this.attackerFittingPopup.popup);
    this.popupGroup.register(this.targetFittingPopup.popup);
    this.popupGroup.register(this.importController.popup);
    this.popupGroup.register(this.shareController.popup);
    this.popupGroup.register(this.turretController.popup);
    this.popupGroup.register(this.boosterController.popup("attacker"));
    this.popupGroup.register(this.boosterController.popup("target"));
    this.hullDatalist.populate();
    this.attackerSide.sections.skill.renderSkillOptions();
    this.targetSide.sections.skill.renderSkillOptions();
    this.els.play.addEventListener("click", () => this.onPlayPause());
    this.els.reset.addEventListener("click", () => this.onReset());
    this.els.simSpeed.addEventListener("change", () => this.onSpeedChange(this.preferencesController.getSpeed()));
    this.els.initialDistance.addEventListener("input", () => this.onConfigChange());
  }

  isPlaying(): boolean { return this.playing; }

  onPlayPause(): void { this.callbacks?.onPlayPause(); }
  onReset(): void { this.callbacks?.onReset(); }
  onSpeedChange(speed: number): void { this.callbacks?.onSpeedChange(speed); }
  onConfigChange(): void {
    this.attackerSide.sections.skill.setOverloadDisabled();
    this.targetSide.sections.skill.setOverloadDisabled();
    this.ewarController.updateSummaries();
    this.boosterController.updateSummaries();
    this.rangeOverlayController.render();
    this.persistConfigChange();
  }
  currentDistance(): number { return this.currentDistanceValue; }
  projection(side: "attacker" | "target"): EwarProjection | undefined { return this.ewarController.projection(side); }
  onDisplayChange(): void {
    this.preferencesController.savePreferences();
    this.notifyDisplayChange();
  }

  private onConfigInvalidated(persist: boolean): void {
    this.preferencesController.savePreferences();
    if (persist) this.profileController.updateActionBarState();
    this.callbacks?.onConfigChange();
  }

  private onLanguageChanged(): void {
    this.deps.i18n.translateDocument();
    this.ewarController.render();
    this.boosterController.render();
    this.rangeOverlayController.render();
    this.setPlaying(this.playing);
    this.notifyDisplayChange();
  }

  private notifyDisplayChange(): void {
    this.profileController.updateActionBarState();
    this.callbacks?.onDisplayChange();
  }

  onProfileLoaded(name: string): void {
    const profile = this.deps.settingsStore.loadProfile(name);
    if (!profile) return;
    this.sessionCodec.restore(this.sessionCodec.fromProfile(profile), name);
    this.callbacks?.onReset();
  }

  onNewProfile(): void {
    this.sessionCodec.resetToDefaults();
    this.profileController.showStatus("status.newProfile");
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
    this.profileController.updateActionBarState();
    if (notify) this.callbacks?.onConfigChange();
  }

  getTurret(): TurretSpec { return this.turretController.currentTurretSpec(); }
  getTargetSig(): number { return this.targetSide.capture().sig ?? 1; }
  getConfig(): SimConfig {
    const initialDistance = this.sessionCodec.getInitialDistance();
    const aggressivity = this.preferencesController.getManeuverAggressivity();
    const attackerState = this.attackerSide.capture();
    const targetState = this.targetSide.capture();
    const attacker: CombatantConfig = {
      id: "attacker", maxSpeed: attackerState.speed, baseMaxSpeed: attackerState.baseMaxSpeed ?? attackerState.speed, mass: attackerState.mass,
      inertiaModifier: attackerState.inertia, mode: attackerState.mode,
      desiredRange: attackerState.range, aggressivity, orbitDirection: "cw",
      ewar: this.ewarController.projection("attacker"),
      boosts: this.boosterController.projection("attacker"),
    };
    const target: CombatantConfig = {
      id: "target", maxSpeed: targetState.speed, baseMaxSpeed: targetState.baseMaxSpeed ?? targetState.speed, mass: targetState.mass,
      inertiaModifier: targetState.inertia, mode: targetState.mode,
      desiredRange: targetState.range, aggressivity: AGGRESSIVITY_MIN, orbitDirection: "cw",
      ewar: this.ewarController.projection("target"),
      boosts: this.boosterController.projection("target"),
    };
    return { attacker, target, initialDistance };
  }
  getSpeed(): number { return this.preferencesController.getSpeed(); }
  getGridBrightness(): number { return this.preferencesController.getGridBrightness(); }
  getOverlays(): readonly RangeOverlay[] { return this.rangeOverlayController.overlays(); }
  update(frame: EngagementFrame, hit: HitChanceBreakdown, effective: EffectiveReadouts): void {
    this.currentDistanceValue = frame.distance;
    this.engagementReadout.update(frame, hit, (key) => this.deps.i18n.t(key));
    this.effectiveReadout.update(effective);
    this.rangeOverlayController.update();
  }
  setPlaying(playing: boolean): void {
    this.playing = playing;
    this.els.play.textContent = this.deps.i18n.t(playing ? "button.pause" : "button.play");
  }
  setCallbacks(callbacks: ControlsCallbacks): void { this.callbacks = callbacks; }
}
