import {
  type EngagementFrame,
  type HitChanceBreakdown,
  type SimConfig,
  type TurretSpec,
} from "../../../sim";
import type { ProfileSettings } from "../../../appstate";
import { isEventTargetWithClosest, num } from "../controlsDom";
import type { Controls, ControlsCallbacks, EffectiveReadouts } from "../controlsContract";
import type { DomControlsDeps, DomControlsHost } from "./domControlsContract";
import type { EffectiveReadout } from "../effectiveReadout";
import type { FittingPreviewManager, PopupGroup } from "../popup";
import type { HintRotator } from "../hints";
import type { HullDatalist, SessionCodec, SessionControl, SimConfigSource } from "../session";
import type { PreferencesController } from "../preferences";
import type { ProfileController } from "../profile";
import type { EngagementReadout } from "../engagementReadout";
import type { SidePanel } from "../sidePanel";
import type { TurretController } from "../turret";
import type { EwarController } from "../ewar";
import type { BoosterController } from "../booster";
import type { ImportController } from "../import";
import type { ShareController } from "../share";
import type { RangeOverlay } from "../../renderer";
import type { RangeOverlayController } from "../rangeOverlay";

export type { Controls, ControlsCallbacks } from "../controlsContract";

interface DomControlsEls {
  play: HTMLButtonElement;
  reset: HTMLButtonElement;
  simSpeed: HTMLSelectElement;
  initialDistance: HTMLInputElement;
}

interface DomControlsAllDeps extends DomControlsDeps {
  els: DomControlsEls;
  popupGroup: PopupGroup;
  hintRotator: HintRotator;
  hullDatalist: HullDatalist;
  preferencesController: PreferencesController;
  profileController: ProfileController;
  engagementReadout: EngagementReadout;
  effectiveReadout: EffectiveReadout;
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
  simConfigSource: SimConfigSource;
}

export class DomControls implements Controls, DomControlsHost, SessionControl {
  private readonly deps: DomControlsDeps;
  private readonly els: DomControlsEls;
  private readonly popupGroup: PopupGroup;
  private readonly hintRotator: HintRotator;
  private readonly hullDatalist: HullDatalist;
  private readonly preferencesController: PreferencesController;
  private readonly profileController: ProfileController;
  private readonly engagementReadout: EngagementReadout;
  private readonly effectiveReadout: EffectiveReadout;
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
  private readonly simConfigSource: SimConfigSource;
  private currentDistanceValue: number;

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
    this.simConfigSource = all.simConfigSource;
    this.currentDistanceValue = num(this.els.initialDistance);
    this.deps.events.emitDistanceChanged(this.currentDistanceValue);
    this.deps.events.onLanguageChanged(() => this.onLanguageChanged());
    this.deps.events.onConfigInvalidated((persist) => this.onConfigInvalidated(persist));
    this.deps.events.onDisplayInvalidated(() => this.onDisplayChange());
    this.deps.events.onProfileLoaded((name) => this.onProfileLoaded(name));
    this.deps.events.onNewProfile(() => this.onNewProfile());
    this.deps.events.onProfileTextLoaded((settings) => this.onProfileTextLoaded(settings));
  }

  wireControls(): void {
    this.popupGroup.register(this.importController.popup);
    this.popupGroup.register(this.shareController.popup);
    this.popupGroup.register(this.turretController.popup);
    this.hullDatalist.populate();
    this.attackerSide.sections.skill.renderSkillOptions();
    this.targetSide.sections.skill.renderSkillOptions();
    this.els.play.addEventListener("click", () => this.onPlayPause());
    this.els.reset.addEventListener("click", () => this.onReset());
    this.els.simSpeed.addEventListener("change", () => this.onSpeedChange(this.preferencesController.getSpeed()));
    this.els.initialDistance.addEventListener("input", () => this.onConfigChange());
    document.addEventListener("pointerdown", (event: PointerEvent) => this.onDocumentPointerDown(event));
    document.addEventListener("keydown", (event: KeyboardEvent) => this.onDocumentKeyDown(event));
  }

  isPlaying(): boolean { return this.playing; }

  onPlayPause(): void { this.callbacks?.onPlayPause(); }
  onReset(): void { this.callbacks?.onReset(); }
  onSpeedChange(speed: number): void { this.callbacks?.onSpeedChange(speed); }
  onConfigChange(persist = true): void {
    this.attackerSide.sections.skill.setOverloadDisabled();
    this.targetSide.sections.skill.setOverloadDisabled();
    this.ewarController.updateSummaries();
    this.boosterController.updateSummaries();
    this.rangeOverlayController.render();
    this.preferencesController.savePreferences();
    if (persist) this.profileController.updateActionBarState();
    this.callbacks?.onConfigChange();
  }
  currentDistance(): number { return this.currentDistanceValue; }
  onDisplayChange(): void {
    this.preferencesController.savePreferences();
    this.notifyDisplayChange();
  }

  private onConfigInvalidated(persist: boolean): void {
    this.onConfigChange(persist);
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

  onProfileTextLoaded(settings: ProfileSettings): void {
    this.sessionCodec.restore(this.sessionCodec.fromProfile(settings));
    this.profileController.showStatus("status.profileImported");
    this.callbacks?.onReset();
  }

  persistConfigChange(notify = true): void {
    this.preferencesController.savePreferences();
    this.profileController.updateActionBarState();
    if (notify) this.callbacks?.onConfigChange();
  }

  getTurret(): TurretSpec { return this.turretController.currentTurretSpec(); }
  getTargetSig(): number { return this.targetSide.capture().sig ?? 1; }
  getConfig(): SimConfig { return this.simConfigSource.getConfig(); }
  getSpeed(): number { return this.preferencesController.getSpeed(); }
  getGridBrightness(): number { return this.preferencesController.getGridBrightness(); }
  getOverlays(): readonly RangeOverlay[] { return this.rangeOverlayController.overlays(); }
  update(frame: EngagementFrame, hit: HitChanceBreakdown, effective: EffectiveReadouts): void {
    this.currentDistanceValue = frame.distance;
    this.deps.events.emitDistanceChanged(this.currentDistanceValue);
    this.engagementReadout.update(frame, hit, (key) => this.deps.i18n.t(key));
    this.effectiveReadout.update(effective);
    this.rangeOverlayController.update();
  }
  setPlaying(playing: boolean): void {
    this.playing = playing;
    this.els.play.textContent = this.deps.i18n.t(playing ? "button.pause" : "button.play");
  }
  setCallbacks(callbacks: ControlsCallbacks): void { this.callbacks = callbacks; }

  private onDocumentPointerDown(event: PointerEvent): void {
    const previewOpen = this.previewManager.openSide();
    if (!this.popupGroup.hasOpen() && !previewOpen) return;
    const target = event.target;
    if (!isEventTargetWithClosest(target)) return;
    this.popupGroup.onPointerDown(target);
    this.previewManager.handlePointerDown(target);
  }

  private onDocumentKeyDown(event: KeyboardEvent): void {
    if (event.key !== "Escape") return;
    if (this.previewManager.openSide()) this.previewManager.handleEscape();
    this.popupGroup.onKeyDown(event);
  }
}
