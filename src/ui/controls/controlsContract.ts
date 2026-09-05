import type { EngineConfig, SideReadoutValues, SimConfig, WeaponSpec } from "../../sim";
import type { WeaponRangeVisibility } from "../../appstate";
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
  getConfig(): SimConfig;
  getEngineConfig(): EngineConfig;
  getSpeed(): number;
  getGridBrightness(): number;
  getAutoZoom(): boolean;
  getZoomFactor(): number;
  getWeaponRangeVisibility(): WeaponRangeVisibility;
  getDroneRangeVisibility(): WeaponRangeVisibility;
  getDroneControlRangeVisibility(): WeaponRangeVisibility;
  getOverlays(): readonly RangeOverlay[];
  setPlaying(playing: boolean): void;
  setCallbacks(callbacks: ControlsCallbacks): void;
}
