import type { EngagementFrame, HitChanceBreakdown, ShipConfig, SimConfig, TurretSpec } from "../../sim";
import type { RangeOverlay } from "../renderer";

export interface ControlsCallbacks {
  readonly onReset: () => void;
  readonly onConfigChange: () => void;
  readonly onDisplayChange: () => void;
  readonly onPlayPause: () => void;
  readonly onSpeedChange: (speed: number) => void;
}

export interface EffectiveReadouts {
  readonly attackerSpeed: number;
  readonly targetSpeed: number;
  readonly tracking: number;
  readonly optimal: number;
  readonly falloff: number;
}

export interface Controls {
  getTurret(): TurretSpec;
  getTargetSig(): number;
  getConfig(): SimConfig;
  getSpeed(): number;
  getGridBrightness(): number;
  getOverlays(): readonly RangeOverlay[];
  update(frame: EngagementFrame, hit: HitChanceBreakdown, effective: EffectiveReadouts): void;
  setPlaying(playing: boolean): void;
  setCallbacks(callbacks: ControlsCallbacks): void;
}
