import type { Vec2 } from "./vec2";

export const SIG_RESOLUTIONS = { S: 40, M: 125, L: 400, XL: 2000 } as const;
export type SigResolutionClass = keyof typeof SIG_RESOLUTIONS;

export function isSigResolutionClass(value: unknown): value is SigResolutionClass {
  return value === "S" || value === "M" || value === "L" || value === "XL";
}

export type AutopilotMode = "orbit" | "keepAtRange" | "midships";

export function isAutopilotMode(value: unknown): value is AutopilotMode {
  return value === "orbit" || value === "keepAtRange" || value === "midships";
}

export type OrbitDirection = "cw" | "ccw";

export interface ShipConfig {
  readonly id: "attacker" | "target";
  readonly maxSpeed: number;
  // New configurations should carry the naked-hull (propulsion-independent) speed.
  // Older saved profiles and URLs may not have the field; `DomControls` and state
  // restoration use `maxSpeed` as a fallback so they still simulate identically.
  readonly baseMaxSpeed?: number;
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
  ewar?: EwarProjection;
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

export interface DisruptionScriptSpec {
  readonly name: string;
  readonly trackingMultiplier: number;
  readonly optimalMultiplier: number;
  readonly falloffMultiplier: number;
}

export interface StasisWebSpec {
  readonly moduleName: string;
  readonly maxRange: number;
  readonly speedFactor: number;
  readonly overloadRangeBonusPercent: number;
}

export interface TrackingDisruptorSpec {
  readonly moduleName: string;
  readonly optimal: number;
  readonly falloff: number;
  readonly disruption: number;
  readonly defaultScript: DisruptionScriptSpec | undefined;
  readonly overloadStrengthBonusPercent: number;
}

export interface WarpScramblerSpec {
  readonly moduleName: string;
  readonly maxRange: number;
  readonly overloadRangeBonusPercent: number;
}

export interface ScramblerActivation {
  readonly active: boolean;
  readonly overloaded: boolean;
}

export interface EwarLoadout {
  readonly webs: readonly StasisWebSpec[];
  readonly disruptors: readonly TrackingDisruptorSpec[];
  readonly scramblers: readonly WarpScramblerSpec[];
  readonly scripts: readonly DisruptionScriptSpec[];
}

export const EMPTY_EWAR_LOADOUT: EwarLoadout = { webs: [], disruptors: [], scramblers: [], scripts: [] };

export interface WebActivation {
  readonly active: boolean;
  readonly overloaded: boolean;
}

export interface DisruptorActivation {
  readonly active: boolean;
  readonly overloaded: boolean;
  readonly script: DisruptionScriptSpec | undefined;
}

export interface ScramblerActivation {
  readonly active: boolean;
  readonly overloaded: boolean;
}

export interface EwarActivation {
  readonly webs: readonly WebActivation[];
  readonly disruptors: readonly DisruptorActivation[];
  readonly scramblers: readonly ScramblerActivation[];
}

export interface EwarProjection {
  readonly loadout: EwarLoadout;
  readonly activation?: EwarActivation;
}

export interface CombatantConfig extends ShipConfig {
  readonly ewar?: EwarProjection;
}
