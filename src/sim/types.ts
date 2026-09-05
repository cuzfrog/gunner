import type { TypeId } from "../gamedata/ids";
import type { Vec2 } from "./vec2";

export const SIG_RESOLUTIONS = { S: 40, M: 125, L: 400, XL: 2000 } as const;
export type SigResolutionClass = keyof typeof SIG_RESOLUTIONS;

export type Side = "shipA" | "shipB";

export type DamageType = "em" | "thermal" | "kinetic" | "explosive";
export type DamageVector = Readonly<Record<DamageType, number>>;
export type DamageResists = Readonly<Record<DamageType, number>>;
export type DefenseLayer = "shield" | "armor" | "hull";

export const ZERO_DAMAGE: DamageVector = { em: 0, thermal: 0, kinetic: 0, explosive: 0 };
export const DAMAGE_TYPES: readonly DamageType[] = ["em", "thermal", "kinetic", "explosive"];
export const DEFENSE_LAYERS: readonly DefenseLayer[] = ["shield", "armor", "hull"];

export function damageVectorSum(vec: DamageVector): number {
  return vec.em + vec.thermal + vec.kinetic + vec.explosive;
}

export function damageVectorScale(vec: DamageVector, factor: number): DamageVector {
  return { em: vec.em * factor, thermal: vec.thermal * factor, kinetic: vec.kinetic * factor, explosive: vec.explosive * factor };
}

export function damageVectorAdd(a: DamageVector, b: DamageVector): DamageVector {
  return { em: a.em + b.em, thermal: a.thermal + b.thermal, kinetic: a.kinetic + b.kinetic, explosive: a.explosive + b.explosive };
}

export function damageVectorFromPartial(partial: Readonly<Partial<Record<DamageType, number>>>): DamageVector {
  return { em: partial.em ?? 0, thermal: partial.thermal ?? 0, kinetic: partial.kinetic ?? 0, explosive: partial.explosive ?? 0 };
}

export const AGGRESSIVITY_MIN = 0.01;
export const AGGRESSIVITY_MAX = 100;

export type AutopilotMode = "orbit" | "keepAtRange" | "midships" | "maneuver";

export type OrbitDirection = "cw" | "ccw";

export interface ShipConfig {
  readonly id: "shipA" | "shipB";
  readonly maxSpeed: number;
  // New configurations should carry the naked-hull (propulsion-independent) speed.
  // Older saved profiles and URLs may not have the field; `DomControls` and state
  // restoration use `maxSpeed` as a fallback so they still simulate identically.
  readonly baseMaxSpeed?: number;
  // Max speed while warp-scrambled: the producer strips boosts only from modules
  // a scrambler actually shuts down (MWD). Absent = legacy fallback
  // (baseMaxSpeed ?? maxSpeed).
  readonly suppressedMaxSpeed?: number;
  readonly mass: number;
  readonly inertiaModifier: number;
  readonly mode: AutopilotMode;
  readonly desiredRange: number;
  readonly aggressivity: number;
  readonly sig?: number;
  readonly orbitDirection?: OrbitDirection;
}

export interface ShipState extends ShipConfig {
  position: Vec2;
  velocity: Vec2;
  ewar?: EwarProjection;
  boosts?: TurretBoostProjection;
  missileBoosts?: MissileBoosterProjection;
  sensorBoosts?: SensorBoostProjection;
  sensorSpec?: SensorSpec;
}

export interface SimConfig {
  readonly shipA: CombatantConfig;
  readonly shipB: CombatantConfig;
  readonly initialDistance: number;
}

export interface SimSnapshot {
  readonly time: number;
  readonly shipA: ShipState;
  readonly shipB: ShipState;
  // Autopilot velocity commands for the current states: what the dynamics
  // engine tracks, shown alongside the actual state for debugging.
  readonly commands: { readonly shipA: Vec2; readonly shipB: Vec2 };
}

export interface TrackingApplicationSpec {
  readonly tracking: number; // rad/s
  readonly sigResolution: number; // m
  readonly optimal: number; // m
  readonly falloff: number; // m
}

export interface TurretSpec extends TrackingApplicationSpec {
  readonly kind: "turret";
  readonly damagePerShot: DamageVector;
  readonly cycleTime: number; // seconds
  readonly turretCount: number;
}

export interface MissileSpec {
  readonly kind: "missile";
  readonly damagePerMissile: DamageVector;
  readonly cycleTime: number; // seconds
  readonly launcherCount: number;
  readonly explosionRadius: number;
  readonly explosionVelocity: number;
  readonly damageReductionFactor: number;
  readonly maxVelocity: number;
  readonly flightTime: number; // seconds
  readonly flightRange: number; // maxVelocity * flightTime, computed by the producer
}

export interface DroneSpec extends TrackingApplicationSpec {
  readonly kind: "drone";
  readonly damagePerShot: DamageVector; // base damage of one drone per cycle
  readonly cycleTime: number; // seconds
  readonly droneCount: number;
  readonly maxVelocity: number; // m/s, 0 for sentries
  readonly orbitSpeed: number; // m/s, 0 for sentries
  readonly orbitRange: number; // m, distance drones orbit the target (entityFlyRange)
  readonly isSentry: boolean;
  readonly controlRange: number; // m, ship-to-target max command distance
}

export type DroneMode = "idle" | "engaging" | "returning";

export interface DroneRuntimeState {
  readonly mode: DroneMode;
  readonly positions: readonly Vec2[]; // individual drone positions
  readonly distanceToTarget: number; // m, group-average drone-to-target
  readonly distanceToSlot: number; // m, group-average distance to desired orbit position
  readonly inControlRange: boolean; // ship-to-target <= controlRange
}

export type WeaponSpec = TurretSpec | MissileSpec | DroneSpec;
export type WeaponKind = "turret" | "missile" | "drone";

export interface DamageAssessment {
  readonly nominalDps: number;
  readonly appliedDps: number;
  readonly application: number; // 0..1, applied/nominal
  readonly volley: number; // per cycle, all launchers/turrets
  readonly baseVolleyByType: DamageVector; // per-cycle volley per type, pre-application, count-scaled
  readonly appliedByType: DamageVector; // DPS per type
  readonly appliedVolleyByType: DamageVector; // per-cycle volley per type, post-application
}

export interface DamageEvent {
  readonly target: Side;
  readonly source: Side;
  readonly weaponIndex: number;
  readonly kind: WeaponKind;
  readonly rawByType: DamageVector; // post-hit-quality, pre-resist
}

export interface TurretDamageBreakdown {
  readonly hit: HitChanceBreakdown;
  readonly expectedMultiplier: number;
}

export interface MissileApplicationResult {
  readonly application: number;
  readonly signatureTerm: number; // S/E
  readonly velocityTerm: number; // (S/E * Ve/Vt)^drf
}

export interface MissileDamageBreakdown {
  readonly application: number;
  readonly signatureTerm: number; // S/E
  readonly velocityTerm: number; // (S/E * Ve/Vt)^drfNorm
  readonly inRange: boolean; // interceptable with remaining fuel
  readonly timeToImpact: number; // seconds, nearest in-flight ETA
}

export interface MissileRuntimeState {
  readonly position: Vec2;
  readonly velocity: Vec2;
  readonly trail: readonly Vec2[];
  readonly side: Side;
  readonly weaponIndex: number;
}

export interface MissileAttackFacts {
  readonly inFlightCount: number;
  readonly nearestTimeToImpact: number;
  readonly predicted: MissileApplicationResult;
  readonly interceptable: boolean;
}

export interface MissileLaunchSpec {
  readonly weaponIndex: number;
  readonly boosted: MissileSpec;
  readonly paintedTargetSig: number;
  readonly baseVolleyByType: DamageVector; // per-cycle volley per type, pre-application, count-scaled
}

export interface MissileSimConfig {
  readonly shipA: readonly MissileSpec[];
  readonly shipB: readonly MissileSpec[];
}

export interface DroneDamageBreakdown {
  readonly hit: HitChanceBreakdown;
  readonly expectedMultiplier: number;
  readonly inRange: boolean;
  readonly inWeaponRange: boolean; // target within optimal + 3*falloff
  readonly mode: DroneMode;
  readonly distanceToTarget: number; // m, drone-to-target
  readonly inControlRange: boolean; // ship-to-target <= controlRange
}

export interface EngagementFrame {
  readonly time: number;
  readonly shipA: ShipState;
  readonly shipB: ShipState;
  readonly relPosition: Vec2; // shipB.pos - shipA.pos
  readonly distance: number; // m
  readonly relVelocity: Vec2; // shipB.vel - shipA.vel
  readonly radialVelocity: number; // m/s, positive = shipB moving away along LOS
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
  readonly moduleId: TypeId;
  readonly trackingMultiplier: number;
  readonly optimalMultiplier: number;
  readonly falloffMultiplier: number;
}

export interface TurretScriptSpec {
  readonly name: string;
  readonly moduleId: TypeId;
  readonly trackingMultiplier: number;
  readonly optimalMultiplier: number;
  readonly falloffMultiplier: number;
}

export interface StasisWebSpec {
  readonly moduleName: string;
  readonly moduleId: TypeId;
  readonly maxRange: number;
  readonly speedFactor: number;
  readonly overloadRangeBonusPercent: number;
}

export interface StasisGrapplerSpec {
  readonly moduleName: string;
  readonly moduleId: TypeId;
  readonly optimal: number;
  readonly falloff: number;
  readonly speedFactor: number;
  readonly overloadOptimalBonusPercent: number;
}

export interface TrackingDisruptorSpec {
  readonly moduleName: string;
  readonly moduleId: TypeId;
  readonly optimal: number;
  readonly falloff: number;
  readonly disruption: number;
  readonly defaultScript: DisruptionScriptSpec | undefined;
  readonly overloadStrengthBonusPercent: number;
}

export interface WarpScramblerSpec {
  readonly moduleName: string;
  readonly moduleId: TypeId;
  readonly maxRange: number;
  readonly overloadRangeBonusPercent: number;
}

export interface TargetPainterSpec {
  readonly moduleName: string;
  readonly moduleId: TypeId;
  readonly maxRange: number;
  readonly falloff: number;
  readonly signatureRadiusBonusPercent: number;
  readonly overloadStrengthBonusPercent: number;
}

export interface SensorDampenerScriptSpec {
  readonly name: string;
  readonly moduleId: TypeId;
  readonly scanResolutionMultiplier: number;
  readonly maxTargetRangeMultiplier: number;
}

export interface SensorDampenerSpec {
  readonly moduleName: string;
  readonly moduleId: TypeId;
  readonly optimal: number;
  readonly falloff: number;
  readonly scanResolutionBonusPercent: number;
  readonly maxTargetRangeBonusPercent: number;
  readonly overloadStrengthBonusPercent: number;
  readonly defaultScript: SensorDampenerScriptSpec | undefined;
}

export interface SensorBoosterScriptSpec {
  readonly name: string;
  readonly moduleId: TypeId;
  readonly scanResolutionMultiplier: number;
  readonly maxTargetRangeMultiplier: number;
}

export interface SensorBoosterSpec {
  readonly moduleName: string;
  readonly moduleId: TypeId;
  readonly scanResolutionBonusPercent: number;
  readonly maxTargetRangeBonusPercent: number;
  readonly overloadStrengthBonusPercent: number;
  readonly defaultScript: SensorBoosterScriptSpec | undefined;
}

export interface SignalAmplifierSpec {
  readonly moduleName: string;
  readonly moduleId: TypeId;
  readonly scanResolutionBonusPercent: number;
  readonly maxTargetRangeBonusPercent: number;
  readonly maxLockedTargetsBonus: number;
}

export interface SensorBoostLoadout {
  readonly boosters: readonly SensorBoosterSpec[];
  readonly amplifiers: readonly SignalAmplifierSpec[];
  readonly boosterScripts: readonly SensorBoosterScriptSpec[];
}

export const EMPTY_SENSOR_BOOST_LOADOUT: SensorBoostLoadout = { boosters: [], amplifiers: [], boosterScripts: [] };

export interface SensorBoosterActivation {
  readonly active: boolean;
  readonly overloaded: boolean;
  readonly script: SensorBoosterScriptSpec | undefined;
}

export interface SensorBoostProjection {
  readonly loadout: SensorBoostLoadout;
  readonly activation?: readonly SensorBoosterActivation[];
}

export interface SensorSpec {
  readonly scanResolution: number;
  readonly maxTargetingRange: number;
  readonly maxLockedTargets: number;
}

export type LockStatus = "idle" | "locking" | "locked";

export interface LockState {
  readonly status: LockStatus;
  readonly progress: number;
  readonly remaining: number;
  readonly lockTime: number;
  readonly inRange: boolean;
}

export const IDLE_LOCK: LockState = { status: "idle", progress: 0, remaining: 0, lockTime: 0, inRange: false };

export interface TrackingBoosterSpec {
  readonly moduleName: string;
  readonly moduleId: TypeId;
  readonly trackingBonusPercent: number;
  readonly optimalBonusPercent: number;
  readonly falloffBonusPercent: number;
  readonly defaultScript: TurretScriptSpec | undefined;
}

export interface MissileScriptSpec {
  readonly name: string;
  readonly moduleId: TypeId;
  readonly explosionRadiusMultiplier: number;
  readonly explosionVelocityMultiplier: number;
  readonly missileVelocityMultiplier: number;
  readonly flightTimeMultiplier: number;
}

export interface MissileBoosterSpec {
  readonly moduleName: string;
  readonly moduleId: TypeId;
  readonly explosionRadiusBonusPercent: number;
  readonly explosionVelocityBonusPercent: number;
  readonly missileVelocityBonusPercent: number;
  readonly flightTimeBonusPercent: number;
  readonly overloadStrengthBonusPercent: number;
  readonly defaultScript: MissileScriptSpec | undefined;
}

export interface MissileEnhancerSpec {
  readonly moduleName: string;
  readonly moduleId: TypeId;
  readonly explosionRadiusBonusPercent: number;
  readonly explosionVelocityBonusPercent: number;
  readonly missileVelocityBonusPercent: number;
  readonly flightTimeBonusPercent: number;
}

export interface BoostLoadout {
  readonly computers: readonly TrackingBoosterSpec[];
  readonly scripts: readonly TurretScriptSpec[];
}

export const EMPTY_BOOST_LOADOUT: BoostLoadout = { computers: [], scripts: [] };

export interface MissileBoosterLoadout {
  readonly computers: readonly MissileBoosterSpec[];
  readonly enhancers: readonly MissileEnhancerSpec[];
  readonly scripts: readonly MissileScriptSpec[];
}

export const EMPTY_MISSILE_BOOSTER_LOADOUT: MissileBoosterLoadout = { computers: [], enhancers: [], scripts: [] };

export interface EwarLoadout {
  readonly webs: readonly StasisWebSpec[];
  readonly grapplers: readonly StasisGrapplerSpec[];
  readonly disruptors: readonly TrackingDisruptorSpec[];
  readonly scramblers: readonly WarpScramblerSpec[];
  readonly painters: readonly TargetPainterSpec[];
  readonly dampeners: readonly SensorDampenerSpec[];
  readonly scripts: readonly DisruptionScriptSpec[];
  readonly dampenerScripts: readonly SensorDampenerScriptSpec[];
}

export const EMPTY_EWAR_LOADOUT: EwarLoadout = { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], scripts: [], dampenerScripts: [] };

export interface WebActivation {
  readonly active: boolean;
  readonly overloaded: boolean;
}

export interface GrapplerActivation {
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

export interface PainterActivation {
  readonly active: boolean;
  readonly overloaded: boolean;
}

export interface DampenerActivation {
  readonly active: boolean;
  readonly overloaded: boolean;
  readonly script: SensorDampenerScriptSpec | undefined;
}

export interface EwarActivation {
  readonly webs: readonly WebActivation[];
  readonly grapplers: readonly GrapplerActivation[];
  readonly disruptors: readonly DisruptorActivation[];
  readonly scramblers: readonly ScramblerActivation[];
  readonly painters: readonly PainterActivation[];
  readonly dampeners: readonly DampenerActivation[];
}

export interface EwarProjection {
  readonly loadout: EwarLoadout;
  readonly activation?: EwarActivation;
}

export type EwarEffectFamily = "web" | "grappler" | "scrambler" | "disruptor" | "dampener";

export interface AppliedEwarEffect {
  readonly family: EwarEffectFamily;
  readonly moduleId: TypeId;
}

export interface SpeedEffectAttribution {
  readonly family: EwarEffectFamily;
  readonly moduleId: TypeId;
  readonly multiplier: number; // 0..1 factor applied to speed by this module alone
}

export interface SpeedBreakdown {
  readonly effects: readonly SpeedEffectAttribution[];
  readonly propulsionSuppressed: boolean;
}

export interface StatEffectAttribution {
  readonly moduleId: TypeId;
  readonly scriptId: TypeId | undefined;
  readonly multiplier: number; // factor applied to this stat by this module alone
}

export interface DisruptionBreakdown {
  readonly tracking: readonly StatEffectAttribution[];
  readonly optimal: readonly StatEffectAttribution[];
  readonly falloff: readonly StatEffectAttribution[];
}

export interface DampenerBreakdown {
  readonly scanResolution: readonly StatEffectAttribution[];
  readonly maxTargetRange: readonly StatEffectAttribution[];
}

export interface BoosterActivation {
  readonly active: boolean;
  readonly overloaded: boolean;
  readonly script: TurretScriptSpec | undefined;
}

export interface BoostActivation {
  readonly computers: readonly BoosterActivation[];
}

export interface TurretBoostProjection {
  readonly loadout: BoostLoadout;
  readonly activation?: BoostActivation;
}

export interface MissileBoosterActivation {
  readonly active: boolean;
  readonly overloaded: boolean;
  readonly script: MissileScriptSpec | undefined;
}

export interface MissileBoostActivation {
  readonly computers: readonly MissileBoosterActivation[];
}

export interface MissileBoosterProjection {
  readonly loadout: MissileBoosterLoadout;
  readonly activation?: MissileBoostActivation;
}

export interface CombatantConfig extends ShipConfig {
  readonly ewar?: EwarProjection;
  readonly boosts?: TurretBoostProjection;
  readonly missileBoosts?: MissileBoosterProjection;
  readonly sensorBoosts?: SensorBoostProjection;
  readonly sensorSpec?: SensorSpec;
}

export interface DefenseLayerSpec {
  readonly hp: number;
  readonly resists: DamageResists;
}

export interface RepairerSpec {
  readonly layer: DefenseLayer;
  readonly amount: number;
  readonly cycleTime: number;
  readonly capacitorNeed: number;
  readonly heatDamage: number;
  readonly overload: { readonly amountMultiplier: number; readonly cycleTimeMultiplier: number };
  readonly ancillary?: { readonly chargeMultiplier: number; readonly shots: number; readonly reloadTime: number };
  readonly moduleId?: TypeId;
}

export interface RahSpec {
  readonly cycleTime: number;
  readonly shiftAmount: number;
  readonly baseResists: DamageResists;
  readonly overloadCycleTimeMultiplier: number;
  readonly armorResistsWithoutRah: DamageResists;
  readonly moduleId?: TypeId;
}

export interface DefenseSpec {
  readonly layers: Readonly<Record<DefenseLayer, DefenseLayerSpec>>;
  readonly shieldRechargeTime: number;
  readonly repairers: readonly RepairerSpec[];
  readonly signaturePenalty: number;
  readonly rah?: RahSpec;
  readonly shieldUniformity: number; // 0..0.25, bleed-through threshold from TSM skill
}

export const ZERO_RESISTS: DamageResists = { em: 0, thermal: 0, kinetic: 0, explosive: 0 };

export const EMPTY_DEFENSE_SPEC: DefenseSpec = {
  layers: {
    shield: { hp: 0, resists: ZERO_RESISTS },
    armor: { hp: 0, resists: ZERO_RESISTS },
    hull: { hp: 0, resists: ZERO_RESISTS },
  },
  shieldRechargeTime: 0,
  repairers: [],
  signaturePenalty: 0,
  shieldUniformity: 0.25,
};
