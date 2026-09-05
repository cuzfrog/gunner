import type { DefenseSpec, DefenseView, EngagementView, SideReadoutValues, SimConfig, WeaponSpec } from "../../sim";
import type { StoredRahActivation, StoredRepairMode, StoredRepairerActivation, WeaponRangeVisibility } from "../../appstate";
import type { RangeOverlay } from "../renderer";
import type { Side } from "./side";

export type { TurretReadoutValues, MissileReadoutValues, DroneReadoutValues, NoWeaponReadoutValues, SideReadoutValues } from "../../sim";

export interface ControlsCallbacks {
  readonly onReset: () => void;
  readonly onConfigChange: () => void;
  readonly onDisplayChange: () => void;
  readonly onPlayPause: () => void;
  readonly onStop: () => void;
  readonly onSpeedChange: (speed: number) => void;
}

export interface EffectiveReadouts {
  readonly shipA: SideReadoutValues;
  readonly shipB: SideReadoutValues;
}

export interface Controls {
  getWeapon(side: Side): WeaponSpec | undefined;
  getWeapons(side: Side): readonly WeaponSpec[];
  getSig(side: Side): number;
  getDefense(side: Side): DefenseSpec;
  getDamageEnabled(side: Side): boolean;
  getRepairMode(side: Side): StoredRepairMode;
  getRepairerActivation(side: Side): readonly StoredRepairerActivation[];
  getRahActivation(side: Side): StoredRahActivation | undefined;
  getOverloaded(side: Side): boolean;
  getConfig(): SimConfig;
  getSpeed(): number;
  getGridBrightness(): number;
  getAutoZoom(): boolean;
  getZoomFactor(): number;
  getWeaponRangeVisibility(): WeaponRangeVisibility;
  getDroneRangeVisibility(): WeaponRangeVisibility;
  getDroneControlRangeVisibility(): WeaponRangeVisibility;
  getOverlays(): readonly RangeOverlay[];
  hasWeapon(side: Side): boolean;
  update(view: EngagementView, effective: EffectiveReadouts, defenseView: DefenseView): void;
  setPlaying(playing: boolean): void;
  setCallbacks(callbacks: ControlsCallbacks): void;
}

export interface ViewStore {
  currentView(): EngagementView | undefined;
}
