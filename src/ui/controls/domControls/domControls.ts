import {
  type EngineConfig,
  type EngineView,
  type SimConfig,
  type WeaponSpec,
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
import type { SidePanel, WeaponSystemSwitch } from "../sidePanel";
import type { Side } from "../side";
import type { TurretController } from "../turret";
import type { LauncherController } from "../launcher";
import type { DroneController } from "../drone";
import type { EwarController } from "../ewar";
import type { DefenseController } from "../defense";
import type { BoosterController } from "../booster";
import type { MissileBoosterController } from "../missileBooster";
import type { ImportController } from "../import";
import type { ShareController } from "../share";
import type { RangeOverlay } from "../../renderer";
import type { WeaponRangeVisibility } from "../../../appstate";
import type { RangeOverlayController } from "../rangeOverlay";
import type { PortraitsController } from "../portraits";
import type { HoverHintController } from "../hoverHint";
import type { ViewStream } from "../../viewStream";

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
  shipASide: SidePanel;
  shipBSide: SidePanel;
  turretControllers: Record<Side, TurretController>;
  launcherControllers: Record<Side, LauncherController>;
  droneControllers: Record<Side, DroneController>;
  weaponSystemSwitches: Record<Side, WeaponSystemSwitch>;
  importController: ImportController;
  ewarController: EwarController;
  defenseController: DefenseController;
  boosterController: BoosterController;
  missileBoosterController: MissileBoosterController;
  shareController: ShareController;
  rangeOverlayController: RangeOverlayController;
  portraitsController: PortraitsController;
  hoverHintController: HoverHintController;
  previewManager: FittingPreviewManager;
  simConfigSource: SimConfigSource;
  viewStream: ViewStream;
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
  private readonly shipASide: SidePanel;
  private readonly shipBSide: SidePanel;
  private readonly turretControllers: Record<Side, TurretController>;
  private readonly launcherControllers: Record<Side, LauncherController>;
  private readonly droneControllers: Record<Side, DroneController>;
  private readonly weaponSystemSwitches: Record<Side, WeaponSystemSwitch>;
  private readonly importController: ImportController;
  private readonly ewarController: EwarController;
  private readonly defenseController: DefenseController;
  private readonly boosterController: BoosterController;
  private readonly missileBoosterController: MissileBoosterController;
  private readonly shareController: ShareController;
  private readonly rangeOverlayController: RangeOverlayController;
  private readonly portraitsController: PortraitsController;
  private readonly hoverHintController: HoverHintController;
  private readonly previewManager: FittingPreviewManager;
  private readonly simConfigSource: SimConfigSource;
  private readonly viewStream: ViewStream;
  private readonly now: () => number;
  private currentDistanceValue: number;
  private lastReadoutApplyMs = -Infinity;
  private cachedView?: EngineView;

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
    this.shipASide = all.shipASide;
    this.shipBSide = all.shipBSide;
    this.turretControllers = all.turretControllers;
    this.launcherControllers = all.launcherControllers;
    this.droneControllers = all.droneControllers;
    this.weaponSystemSwitches = all.weaponSystemSwitches;
    this.importController = all.importController;
    this.ewarController = all.ewarController;
    this.defenseController = all.defenseController;
    this.boosterController = all.boosterController;
    this.missileBoosterController = all.missileBoosterController;
    this.shareController = all.shareController;
    this.rangeOverlayController = all.rangeOverlayController;
    this.portraitsController = all.portraitsController;
    this.hoverHintController = all.hoverHintController;
    this.previewManager = all.previewManager;
    this.simConfigSource = all.simConfigSource;
    this.viewStream = all.viewStream;
    this.now = all.now;
    this.currentDistanceValue = num(this.els.initialDistance);
    this.deps.events.onLanguageChanged(() => this.onLanguageChanged());
    this.deps.events.onConfigInvalidated(() => this.onConfigInvalidated());
    this.deps.events.onDisplayInvalidated(() => this.onDisplayChange());
    this.deps.events.onSessionRestored(() => this.onSessionRestored());
    this.deps.events.onSessionReset(() => this.onSessionReset());
    this.deps.events.onStartupDefaultsApplied(() => this.onStartupDefaultsApplied());
    this.viewStream.onViewUpdated((view) => this.onReadouts(view));
  }

  wireControls(): void {
    this.popupGroup.register(this.importController.popup);
    this.popupGroup.register(this.shareController.popup);
    this.popupGroup.register(this.turretControllers.shipA.popup);
    this.popupGroup.register(this.turretControllers.shipB.popup);
    this.popupGroup.register(this.preferencesController.popup);
    this.hullDatalist.populate();
    this.shipASide.sections.skill.renderSkillOptions();
    this.shipBSide.sections.skill.renderSkillOptions();
    this.shipASide.sections.skill.renderDefenseSkills();
    this.shipBSide.sections.skill.renderDefenseSkills();
    this.shipASide.sections.skill.renderTargetingSkills();
    this.shipBSide.sections.skill.renderTargetingSkills();
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
  onConfigChange(): void {
    this.shipASide.sections.skill.setOverloadDisabled();
    this.shipBSide.sections.skill.setOverloadDisabled();
    this.ewarController.updateSummaries();
    this.defenseController.updateSummaries();
    this.boosterController.updateSummaries();
    this.missileBoosterController.updateSummaries();
    this.rangeOverlayController.render();
    this.portraitsController.update();
    this.weaponSystemSwitches.shipA.refresh();
    this.weaponSystemSwitches.shipB.refresh();
    this.preferencesController.savePreferences();
    this.profileController.updateActionBarState();
    this.updatePlayEnabled();
    this.callbacks?.onConfigChange();
  }
  currentDistance(): number { return this.currentDistanceValue; }
  onDisplayChange(): void {
    this.preferencesController.savePreferences();
    this.notifyDisplayChange();
  }

  private onConfigInvalidated(): void {
    this.onConfigChange();
  }

  private onLanguageChanged(): void {
    this.deps.i18n.translateDocument();
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
    this.portraitsController.update();
    this.callbacks?.onReset();
  }

  private onSessionReset(): void {
    this.callbacks?.onStop();
    this.updatePlayEnabled();
    this.portraitsController.update();
    this.callbacks?.onReset();
  }

  private onStartupDefaultsApplied(): void {
    this.setPlaying(false);
    this.updatePlayEnabled();
    this.portraitsController.update();
  }

  persistConfigChange(notify = true): void {
    this.preferencesController.savePreferences();
    this.profileController.updateActionBarState();
    this.updatePlayEnabled();
    if (notify) this.callbacks?.onConfigChange();
  }

  getWeapon(side: Side): WeaponSpec | undefined {
    const activeKind = this.weaponSystemSwitches[side].activeKind();
    if (activeKind === "drone") {
      const specs = this.droneControllers[side].currentDroneSpecs();
      if (specs.length > 0) return specs[0];
      return this.turretControllers[side].currentTurretSpec();
    }
    if (activeKind === "missile") {
      const missile = this.launcherControllers[side].currentMissileSpec();
      if (missile) return missile;
      return this.turretControllers[side].currentTurretSpec();
    }
    const turret = this.turretControllers[side].currentTurretSpec();
    if (turret) return turret;
    return this.launcherControllers[side].currentMissileSpec();
  }
  getWeapons(side: Side): readonly WeaponSpec[] {
    const activeKind = this.weaponSystemSwitches[side].activeKind();
    const weapons: WeaponSpec[] = [];
    if (activeKind === "drone") {
      for (const spec of this.droneControllers[side].currentDroneSpecs()) weapons.push(spec);
    } else if (activeKind === "missile") {
      const missile = this.launcherControllers[side].currentMissileSpec();
      if (missile) weapons.push(missile);
    } else {
      for (const turret of this.turretControllers[side].currentTurretSpecs()) weapons.push(turret);
    }
    if (activeKind !== "turret") {
      for (const turret of this.turretControllers[side].currentTurretSpecs()) weapons.push(turret);
    }
    if (activeKind !== "missile") {
      const missile = this.launcherControllers[side].currentMissileSpec();
      if (missile) weapons.push(missile);
    }
    if (activeKind !== "drone") {
      for (const spec of this.droneControllers[side].currentDroneSpecs()) weapons.push(spec);
    }
    return weapons;
  }
  getSig(side: Side): number { return this.sideFor(side).capture().sig ?? 1; }
  getConfig(): SimConfig { return this.simConfigSource.getConfig(); }
  getEngineConfig(): EngineConfig { return this.simConfigSource.getEngineConfig(); }
  getSpeed(): number { return this.preferencesController.getSpeed(); }
  getGridBrightness(): number { return this.preferencesController.getGridBrightness(); }
  getAutoZoom(): boolean { return this.preferencesController.getAutoZoom(); }
  getZoomFactor(): number { return this.preferencesController.getZoomFactor(); }
  getOverlays(): readonly RangeOverlay[] { return this.rangeOverlayController.overlays(); }
  getWeaponRangeVisibility(): WeaponRangeVisibility { return this.preferencesController.getWeaponRangeVisibility(); }
  getDroneRangeVisibility(): WeaponRangeVisibility { return this.preferencesController.getDroneRangeVisibility(); }
  getDroneControlRangeVisibility(): WeaponRangeVisibility { return this.preferencesController.getDroneControlRangeVisibility(); }
  hasWeapon(side: Side): boolean { return this.turretControllers[side].turret() !== undefined || this.launcherControllers[side].launcher() !== undefined || this.droneControllers[side].drone() !== undefined; }
  setPlaying(playing: boolean): void {
    if (!playing && this.playing && this.cachedView) {
      this.applyReadouts(this.cachedView);
      this.lastReadoutApplyMs = this.now();
    }
    this.playing = playing;
    this.els.play.textContent = this.deps.i18n.t(playing ? "button.pause" : "button.play");
    if (playing) this.lastReadoutApplyMs = this.now() - READOUT_INTERVAL_MS;
  }
  setCallbacks(callbacks: ControlsCallbacks): void { this.callbacks = callbacks; }

  private onReadouts(view: EngineView): void {
    this.currentDistanceValue = view.frame.distance;
    this.cachedView = view;
    this.defenseController.updateDefenseView(view.defenseRuntime);
    this.applyReadoutsIfReady();
  }

  private applyReadoutsIfReady(): void {
    const now = this.now();
    if (this.playing && now - this.lastReadoutApplyMs < READOUT_INTERVAL_MS) return;
    if (!this.cachedView) return;
    this.applyReadouts(this.cachedView);
    this.lastReadoutApplyMs = now;
  }

  private applyReadouts(view: EngineView): void {
    this.engagementReadout.update(view, (key) => this.deps.i18n.t(key));
    this.effectiveReadout.update(view.readouts);
    this.defenseController.updateAssessments(view);
    this.defenseController.updateEffectiveSig("shipA", this.getSig("shipA"));
    this.defenseController.updateEffectiveSig("shipB", this.getSig("shipB"));
  }

  private onDocumentPointerDown(event: PointerEvent): void {
    const previewOpen = this.previewManager.openSide();
    if (!this.popupGroup.hasOpen() && !previewOpen) return;
    const domTarget = event.composedPath()[0] ?? null;
    if (!isEventTargetWithClosest(domTarget)) return;
    this.popupGroup.onPointerDown(domTarget);
    this.previewManager.handlePointerDown(domTarget);
  }

  private onDocumentKeyDown(event: KeyboardEvent): void {
    if (event.key !== "Escape") return;
    if (this.previewManager.openSide()) this.previewManager.handleEscape();
    this.popupGroup.onKeyDown(event);
  }

  private updatePlayEnabled(): void {
    this.els.play.disabled = this.shipASide.profile === undefined || this.shipBSide.profile === undefined;
  }

  private sideFor(side: Side): SidePanel { return side === "shipA" ? this.shipASide : this.shipBSide; }
}
