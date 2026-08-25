import {
  type EngagementFrame,
  type HitChanceBreakdown,
  type SimConfig,
  type TurretSpec,
} from "../../../sim";
import { isEventTargetWithClosest, num } from "../controlsDom";
import type { Controls, ControlsCallbacks, EffectiveReadouts } from "../controlsContract";
import type { DomControlsDeps, DomControlsHost } from "./domControlsContract";
import type { EffectiveReadout } from "../effectiveReadout";
import type { FittingPreviewManager, PopupGroup } from "../popup";
import type { HintRotator } from "../hints";
import type { HullDatalist, SimConfigSource } from "../session";
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
import type { PortraitsController } from "../portraits";

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
  importController: ImportController;
  ewarController: EwarController;
  boosterController: BoosterController;
  shareController: ShareController;
  rangeOverlayController: RangeOverlayController;
  portraitsController: PortraitsController;
  previewManager: FittingPreviewManager;
  simConfigSource: SimConfigSource;
}

const READOUT_INTERVAL_MS = 50;

export class DomControls implements Controls, DomControlsHost {
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
  private readonly importController: ImportController;
  private readonly ewarController: EwarController;
  private readonly boosterController: BoosterController;
  private readonly shareController: ShareController;
  private readonly rangeOverlayController: RangeOverlayController;
  private readonly portraitsController: PortraitsController;
  private readonly previewManager: FittingPreviewManager;
  private readonly simConfigSource: SimConfigSource;
  private readonly now: () => number;
  private currentDistanceValue: number;
  private lastReadoutApplyMs = -Infinity;
  private cachedReadouts?: { frame: EngagementFrame; hit: HitChanceBreakdown; effective: EffectiveReadouts };

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
    this.importController = all.importController;
    this.ewarController = all.ewarController;
    this.boosterController = all.boosterController;
    this.shareController = all.shareController;
    this.rangeOverlayController = all.rangeOverlayController;
    this.portraitsController = all.portraitsController;
    this.previewManager = all.previewManager;
    this.simConfigSource = all.simConfigSource;
    this.now = all.now;
    this.currentDistanceValue = num(this.els.initialDistance);
    this.deps.events.emitDistanceChanged(this.currentDistanceValue);
    this.deps.events.onLanguageChanged(() => this.onLanguageChanged());
    this.deps.events.onConfigInvalidated((persist) => this.onConfigInvalidated(persist));
    this.deps.events.onDisplayInvalidated(() => this.onDisplayChange());
    this.deps.events.onSessionRestored(() => this.onSessionRestored());
    this.deps.events.onSessionReset(() => this.onSessionReset());
    this.deps.events.onStartupDefaultsApplied(() => this.onStartupDefaultsApplied());
  }

  wireControls(): void {
    this.popupGroup.register(this.importController.popup);
    this.popupGroup.register(this.shareController.popup);
    this.popupGroup.register(this.turretController.popup);
    this.popupGroup.register(this.preferencesController.popup);
    this.hullDatalist.populate();
    this.attackerSide.sections.skill.renderSkillOptions();
    this.targetSide.sections.skill.renderSkillOptions();
    this.els.play.addEventListener("click", () => this.onPlayPause());
    this.els.reset.addEventListener("click", () => this.onReset());
    this.els.simSpeed.addEventListener("change", () => this.onSpeedChange(this.preferencesController.getSpeed()));
    this.els.initialDistance.addEventListener("input", () => this.onConfigChange());
    document.addEventListener("pointerdown", (event: PointerEvent) => this.onDocumentPointerDown(event));
    document.addEventListener("keydown", (event: KeyboardEvent) => this.onDocumentKeyDown(event));
    this.updatePlayEnabled();
  }

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
    this.updatePlayEnabled();
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

  private onSessionRestored(): void {
    this.setPlaying(this.playing);
    this.updatePlayEnabled();
    this.callbacks?.onReset();
  }

  private onSessionReset(): void {
    this.setPlaying(false);
    this.updatePlayEnabled();
    this.callbacks?.onReset();
  }

  private onStartupDefaultsApplied(): void {
    this.setPlaying(false);
    this.updatePlayEnabled();
  }

  persistConfigChange(notify = true): void {
    this.preferencesController.savePreferences();
    this.profileController.updateActionBarState();
    this.updatePlayEnabled();
    if (notify) this.callbacks?.onConfigChange();
  }

  getTurret(): TurretSpec { return this.turretController.currentTurretSpec(); }
  getTargetSig(): number { return this.targetSide.capture().sig ?? 1; }
  getConfig(): SimConfig { return this.simConfigSource.getConfig(); }
  getSpeed(): number { return this.preferencesController.getSpeed(); }
  getGridBrightness(): number { return this.preferencesController.getGridBrightness(); }
  getAutoZoom(): boolean { return this.preferencesController.getAutoZoom(); }
  getZoomFactor(): number { return this.preferencesController.getZoomFactor(); }
  getOverlays(): readonly RangeOverlay[] { return this.rangeOverlayController.overlays(); }
  hasAttackerGuns(): boolean { return this.turretController.turret() !== undefined; }
  update(frame: EngagementFrame, hit: HitChanceBreakdown, effective: EffectiveReadouts): void {
    this.currentDistanceValue = frame.distance;
    this.deps.events.emitDistanceChanged(this.currentDistanceValue);
    this.cachedReadouts = { frame, hit, effective };
    this.applyReadoutsIfReady();
    this.rangeOverlayController.update();
    this.portraitsController.update();
  }
  setPlaying(playing: boolean): void {
    if (!playing && this.playing && this.cachedReadouts) {
      this.applyReadouts(this.cachedReadouts.frame, this.cachedReadouts.hit, this.cachedReadouts.effective);
      this.lastReadoutApplyMs = this.now();
    }
    this.playing = playing;
    this.els.play.textContent = this.deps.i18n.t(playing ? "button.pause" : "button.play");
    if (playing) this.lastReadoutApplyMs = this.now() - READOUT_INTERVAL_MS;
  }
  setCallbacks(callbacks: ControlsCallbacks): void { this.callbacks = callbacks; }

  private applyReadoutsIfReady(): void {
    const now = this.now();
    if (this.playing && now - this.lastReadoutApplyMs < READOUT_INTERVAL_MS) return;
    if (!this.cachedReadouts) return;
    this.applyReadouts(this.cachedReadouts.frame, this.cachedReadouts.hit, this.cachedReadouts.effective);
    this.lastReadoutApplyMs = now;
  }

  private applyReadouts(frame: EngagementFrame, hit: HitChanceBreakdown, effective: EffectiveReadouts): void {
    this.engagementReadout.update(frame, hit, (key) => this.deps.i18n.t(key));
    this.effectiveReadout.update(effective);
  }

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

  private updatePlayEnabled(): void {
    this.els.play.disabled = this.attackerSide.profile === undefined || this.targetSide.profile === undefined;
  }
}
