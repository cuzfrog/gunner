import type { DisruptionBreakdown, EngagementView, SimConfig, SpeedBreakdown, WeaponSpec } from "../../sim";
import type { WeaponRangeVisibility } from "../../appstate";
import type { RangeOverlay } from "../renderer";
import type { Side } from "./side";

export interface ControlsCallbacks {
  readonly onReset: () => void;
  readonly onConfigChange: () => void;
  readonly onDisplayChange: () => void;
  readonly onPlayPause: () => void;
  readonly onStop: () => void;
  readonly onSpeedChange: (speed: number) => void;
}

export interface TurretReadoutValues {
  readonly kind: "turret";
  readonly speed: number;
  readonly tracking: number;
  readonly optimal: number;
  readonly falloff: number;
  readonly boostedTracking: number;
  readonly boostedOptimal: number;
  readonly boostedFalloff: number;
  readonly sigResolution: number;
  readonly speedBreakdown?: SpeedBreakdown;
  readonly trackingBreakdown?: DisruptionBreakdown;
  readonly optimalBreakdown?: DisruptionBreakdown;
  readonly falloffBreakdown?: DisruptionBreakdown;
}

export interface MissileReadoutValues {
  readonly kind: "missile";
  readonly speed: number;
  readonly explosionRadius: number;
  readonly explosionVelocity: number;
  readonly maxVelocity: number;
  readonly flightTime: number;
  readonly flightRange: number;
  readonly speedBreakdown?: SpeedBreakdown;
}

export interface NoWeaponReadoutValues {
  readonly kind: "none";
  readonly speed: number;
  readonly speedBreakdown?: SpeedBreakdown;
}

export type SideReadoutValues = TurretReadoutValues | MissileReadoutValues | NoWeaponReadoutValues;

export interface EffectiveReadouts {
  readonly shipA: SideReadoutValues;
  readonly shipB: SideReadoutValues;
}

export interface Controls {
  getWeapon(side: Side): WeaponSpec | undefined;
  getWeapons(side: Side): readonly WeaponSpec[];
  getSig(side: Side): number;
  getConfig(): SimConfig;
  getSpeed(): number;
  getGridBrightness(): number;
  getAutoZoom(): boolean;
  getZoomFactor(): number;
  getWeaponRangeVisibility(): WeaponRangeVisibility;
  getOverlays(): readonly RangeOverlay[];
  hasWeapon(side: Side): boolean;
  update(view: EngagementView, effective: EffectiveReadouts): void;
  setPlaying(playing: boolean): void;
  setCallbacks(callbacks: ControlsCallbacks): void;
}
