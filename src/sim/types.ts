import type { Vec2 } from "../math/vec2.js";

export const SIG_RESOLUTIONS = { S: 40, M: 125, L: 400, XL: 2000 } as const;
export type SigResolutionClass = keyof typeof SIG_RESOLUTIONS;

export type AutopilotMode =
  | "orbit"
  | "keepAtRange"
  | "approach"
  | "retreat"
  | "match";

export interface ShipConfig {
  id: "attacker" | "target";
  position: Vec2;
  maxSpeed: number;
  mode: AutopilotMode;
  desiredRange: number;
  orbitDirection?: "cw" | "ccw";
}

export interface ShipState extends ShipConfig {
  velocity: Vec2;
}

export interface TurretSpec {
  tracking: number; // rad/s (old-system tracking speed)
  sigResolution: number; // m
  optimal: number; // m
  falloff: number; // m
}

export interface EngagementFrame {
  time: number;
  attacker: ShipState;
  target: ShipState;
  relPosition: Vec2; // target.pos - attacker.pos
  distance: number; // m
  relVelocity: Vec2; // target.vel - attacker.vel
  radialVelocity: number; // m/s, positive = target moving away along LOS
  transversalVelocity: Vec2; // m/s
  transversalSpeed: number; // m/s
  angularVelocity: number; // rad/s
}

export interface HitChanceBreakdown {
  chance: number; // 0..1
  trackingTerm: number;
  rangeTerm: number;
}
