import type { Vec2 } from "./vec2";

export const SIG_RESOLUTIONS = { S: 40, M: 125, L: 400, XL: 2000 } as const;
export type SigResolutionClass = keyof typeof SIG_RESOLUTIONS;

export type AutopilotMode = "orbit" | "keepAtRange" | "midships";

export type OrbitDirection = "cw" | "ccw";

export interface ShipConfig {
  readonly id: "attacker" | "target";
  readonly maxSpeed: number;
  readonly mass: number;
  readonly inertiaModifier: number;
  readonly mode: AutopilotMode;
  readonly desiredRange: number;
  readonly aggressivity: number;
  readonly orbitDirection?: OrbitDirection;
}

export interface ShipState extends ShipConfig {
  position: Vec2;
  velocity: Vec2;
}

export interface SimConfig {
  readonly attacker: CombatantConfig;
  readonly target: CombatantConfig;
  readonly initialDistance: number;
}

export interface SimSnapshot {
  readonly time: number;
  readonly attacker: ShipState;
  readonly target: ShipState;
  // Autopilot velocity commands for the current states: what the dynamics
  // engine tracks, shown alongside the actual state for debugging.
  readonly commands: { readonly attacker: Vec2; readonly target: Vec2 };
}

export interface TurretSpec {
  readonly tracking: number; // rad/s (old-system tracking speed)
  readonly sigResolution: number; // m
  readonly optimal: number; // m
  readonly falloff: number; // m
}

export interface EngagementFrame {
  readonly time: number;
  readonly attacker: ShipState;
  readonly target: ShipState;
  readonly relPosition: Vec2; // target.pos - attacker.pos
  readonly distance: number; // m
  readonly relVelocity: Vec2; // target.vel - attacker.vel
  readonly radialVelocity: number; // m/s, positive = target moving away along LOS
  readonly transversalVelocity: Vec2; // m/s
  readonly transversalSpeed: number; // m/s
  readonly angularVelocity: number; // rad/s
}

export interface HitChanceBreakdown {
  readonly chance: number; // 0..1
  readonly trackingTerm: number;
  readonly rangeTerm: number;
}

export type DisruptionScript = "none" | "optimalRange" | "trackingSpeed";

export interface StasisWebSpec {
  readonly moduleName: string;
  readonly maxRange: number;
  readonly speedFactor: number;
}

export interface TrackingDisruptorSpec {
  readonly moduleName: string;
  readonly optimal: number;
  readonly falloff: number;
  readonly disruption: number;
  readonly defaultScript: DisruptionScript;
}

export interface EwarLoadout {
  readonly webs: readonly StasisWebSpec[];
  readonly disruptors: readonly TrackingDisruptorSpec[];
}

export const EMPTY_EWAR_LOADOUT: EwarLoadout = { webs: [], disruptors: [] };

export interface WebActivation {
  readonly active: boolean;
}

export interface DisruptorActivation {
  readonly active: boolean;
  readonly script: DisruptionScript;
}

export interface EwarActivation {
  readonly webs: readonly WebActivation[];
  readonly disruptors: readonly DisruptorActivation[];
}

export function ALL_ACTIVE(loadout: EwarLoadout): EwarActivation {
  return {
    webs: loadout.webs.map(() => ({ active: true })),
    disruptors: loadout.disruptors.map((disruptor) => ({ active: true, script: disruptor.defaultScript })),
  };
}

export interface EwarProjection {
  readonly loadout: EwarLoadout;
  readonly activation: EwarActivation;
  readonly overloaded: boolean;
}

export interface CombatantConfig extends ShipConfig {
  readonly ewar?: EwarProjection;
}
