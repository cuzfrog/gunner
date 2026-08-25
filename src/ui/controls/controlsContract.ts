import type { DisruptionBreakdown, EngagementFrame, HitChanceBreakdown, ShipConfig, SimConfig, SpeedBreakdown, TurretSpec } from "../../sim";
import type { RangeOverlay } from "../renderer";

export interface ControlsCallbacks {
  readonly onReset: () => void;
  readonly onConfigChange: () => void;
  readonly onDisplayChange: () => void;
  readonly onPlayPause: () => void;
  readonly onSpeedChange: (speed: number) => void;
}

export interface EffectiveReadouts {
  readonly shipASpeed: number;
  readonly shipBSpeed: number;
  readonly tracking: number;
  readonly optimal: number;
  readonly falloff: number;
  readonly boostedTracking: number;
  readonly boostedOptimal: number;
  readonly boostedFalloff: number;
  readonly shipASpeedBreakdown?: SpeedBreakdown;
  readonly shipBSpeedBreakdown?: SpeedBreakdown;
  readonly trackingBreakdown?: DisruptionBreakdown;
  readonly optimalBreakdown?: DisruptionBreakdown;
  readonly falloffBreakdown?: DisruptionBreakdown;
}

export interface Controls {
  getTurret(): TurretSpec;
  getShipBSig(): number;
  getConfig(): SimConfig;
  getSpeed(): number;
  getGridBrightness(): number;
  getAutoZoom(): boolean;
  getZoomFactor(): number;
  getOverlays(): readonly RangeOverlay[];
  hasShipAGuns(): boolean;
  update(frame: EngagementFrame, hit: HitChanceBreakdown, effective: EffectiveReadouts): void;
  setPlaying(playing: boolean): void;
  setCallbacks(callbacks: ControlsCallbacks): void;
}
