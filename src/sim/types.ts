import type { TypeId } from "../gamedata/ids";
import { Vec2 } from "./vec2";

export const SIG_RESOLUTIONS = { S: 40, M: 125, L: 400, XL: 2000 } as const;
export type SigResolutionClass = keyof typeof SIG_RESOLUTIONS;

export type Side = "shipA" | "shipB";

export type DamageType = "em" | "thermal" | "kinetic" | "explosive";
export type DamageVector = Readonly<Record<DamageType, number>>;
export type DamageResists = Readonly<Record<DamageType, number>>;
export type DefenseLayer = "shield" | "armor" | "hull";

export interface LayerDamage {
  readonly shield: number;
  readonly armor: number;
  readonly hull: number;
}

export interface InflictedDps {
  readonly total: number;
  readonly byLayer: LayerDamage;
}

export const ZERO_DAMAGE: DamageVector = { em: 0, thermal: 0, kinetic: 0, explosive: 0 };
export const DAMAGE_TYPES: readonly DamageType[] = ["em", "thermal", "kinetic", "explosive"];
export const DEFENSE_LAYERS: readonly DefenseLayer[] = ["shield", "armor", "hull"];
/** Every fitted module (SDE attr 9) carries the same 40 structure HP that overheating burns through. */
export const MODULE_HEAT_HITPOINTS = 40;

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
  // Naked-hull (propulsion-independent) speed. `effectiveState` uses this when
  // a scrambler suppresses an MWD. Absent = legacy fallback to `maxSpeed`.
  readonly baseMaxSpeed?: number;
  // Propulsion kind. When a scrambler suppresses propulsion, only MWD is shut
  // down (AB is unaffected). Absent = legacy, treated as no MWD.
  readonly propulsionKind?: "afterburner" | "microwarpdrive";
  readonly mass: number;
  readonly inertiaModifier: number;
  readonly mode: AutopilotMode;
  readonly desiredRange: number;
  readonly aggressivity: number;
  // Base signature radius (without propulsion bloom or extender penalty).
  // `effectiveState` applies bloom and penalty on top of this value.
  readonly sig?: number;
  // Multiplicative propulsion sig bloom factor (e.g. MWD sig bloom * hull reduction).
  // Absent/0 = no propulsion bloom. Applied as `(sig + sigPenalty) * (1 + sigBloom)`.
  readonly sigBloom?: number;
  // Flat signature radius penalty from shield extenders, in meters.
  // Applied additively before bloom: `(sig + sigPenalty) * (1 + sigBloom)`.
  readonly sigPenalty?: number;
  // Propulsion capacitor capacity multiplier (e.g. MWD 0.75). Composes the
  // effective pool from the propulsion-independent CapacitorSpec capacity.
  readonly propulsionCapacityMultiplier?: number;
  // Energy warfare resistance from fitted cap batteries, positive percent
  // (e.g. 25 scales incoming neutralizer/nosferatu amounts by 0.75).
  readonly energyWarfareResistancePercent?: number;
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

export interface TurretSpoolSpec {
  readonly perCycle: number; // damageMultiplierBonusPerCycle, fraction added per completed cycle (e.g. 0.07)
  readonly max: number; // damageMultiplierBonusMax, total fraction bonus cap (e.g. 2.125)
}

export function spoolMultiplier(spool: TurretSpoolSpec | undefined, cycles: number): number {
  return spool === undefined ? 1 : 1 + Math.min(spool.max, cycles * spool.perCycle);
}

export interface TurretSpec extends TrackingApplicationSpec {
  readonly kind: "turret";
  readonly moduleId: TypeId;
  readonly damagePerShot: DamageVector;
  readonly cycleTime: number; // seconds
  readonly turretCount: number;
  readonly spool?: TurretSpoolSpec; // absent for non-spooling turrets
  // GJ per module instance per cycle; the group debits capacitorNeed * turretCount at each activation.
  readonly capacitorNeed?: number;
  // Per-module HP loss per completed overloaded cycle; absent = module cannot take heat damage.
  readonly heatDamagePerCycle?: number;
}

export interface MissileMagazine {
  readonly numShots: number;
  readonly reloadTime: number; // seconds
}

export interface MissileSpec {
  readonly kind: "missile";
  readonly moduleId: TypeId;
  readonly damagePerMissile: DamageVector;
  readonly cycleTime: number; // seconds
  readonly launcherCount: number;
  readonly explosionRadius: number;
  readonly explosionVelocity: number;
  readonly damageReductionFactor: number;
  readonly maxVelocity: number;
  readonly flightTime: number; // seconds
  readonly flightRange: number; // maxVelocity * flightTime, computed by the producer
  readonly magazine?: MissileMagazine; // absent = infinite ammunition (fighters carry their own magazine state)
  // Per-launcher HP loss per completed overloaded launch cycle; absent = launcher cannot take heat damage.
  readonly heatDamagePerCycle?: number;
}

/** Vorton projector: area weapon applying through the missile explosion formula with a hard range cutoff (no falloff). */
export interface VortonSpec {
  readonly kind: "vorton";
  readonly moduleId: TypeId;
  readonly damagePerShot: DamageVector;
  readonly cycleTime: number; // seconds
  readonly count: number; // projector instances in the group
  readonly maxRange: number; // m, hard cutoff
  readonly explosionRadius: number;
  readonly explosionVelocity: number;
  readonly damageReductionFactor: number;
  // GJ per module instance per cycle; the group debits capacitorNeed * count at each activation.
  readonly capacitorNeed?: number;
  // Per-module HP loss per completed overloaded cycle; absent = module cannot take heat damage.
  readonly heatDamagePerCycle?: number;
}

export interface DroneSpec extends TrackingApplicationSpec {
  readonly kind: "drone";
  readonly moduleId: TypeId;
  readonly damagePerShot: DamageVector; // base damage of one drone per cycle
  readonly cycleTime: number; // seconds
  readonly droneCount: number;
  readonly maxVelocity: number; // m/s, 0 for sentries
  readonly orbitSpeed: number; // m/s, 0 for sentries
  readonly orbitRange: number; // m, distance drones orbit the target (entityFlyRange)
  readonly isSentry: boolean;
  readonly controlRange: number; // m, ship-to-target max command distance
  /** Per-drone raw hp pools; undefined when the SDE carries no hp data (the wing cannot be damaged). */
  readonly hp?: UnitPoolsSpec;
  readonly signatureRadius?: number; // m
}

/** Raw shield/armor/hull pools of one simulated unit (drone or fighter); damage cascades shield -> armor -> hull without resists. */
export interface UnitPoolsSpec {
  readonly shield: number;
  readonly armor: number;
  readonly hull: number;
}

/** Kind of non-ship unit a weapon is engaging. */
export type UnitTargetKind = "drone" | "fighter";

/** Target parameters used to assess a ship weapon engaging an opponent's drone or fighter instead of the ship. */
export interface UnitTargetParams {
  readonly kind: UnitTargetKind;
  readonly signatureRadius: number;
  readonly velocity: number;
}

export type DroneMode = "idle" | "engaging" | "returning";

export interface DroneRuntimeState {
  readonly mode: DroneMode;
  readonly positions: readonly Vec2[]; // individual drone positions, alive drones only
  readonly distanceToTarget: number; // m, group-average drone-to-target
  readonly distanceToSlot: number; // m, group-average distance to desired orbit position
  readonly inControlRange: boolean; // ship-to-target <= controlRange
  readonly aliveCount: number; // drones still flying in the group
  readonly hpFractions: readonly number[]; // remaining pooled hp fraction per alive drone
}

export interface FighterMagazine {
  readonly numShots: number; // attack cycles the squadron flies before refueling
  readonly rearmTime: number; // seconds to rearm one attack cycle worth of missiles
  readonly refuelingTime: number; // seconds to return to the hangar
}

export interface FighterSpec {
  readonly kind: "fighter";
  readonly moduleId: TypeId;
  readonly damagePerVolley: DamageVector; // per fighter per cycle, skill/hull multipliers applied
  readonly cycleTime: number; // seconds per attack run
  readonly fighterCount: number; // fighters in the squadron
  readonly maxVelocity: number; // m/s
  readonly orbitRange: number; // m, squadron orbits the target
  readonly explosionRadius: number;
  readonly explosionVelocity: number;
  readonly damageReductionFactor: number; // aggregated exponent ln(DRF)/ln(DRS)
  readonly optimal: number; // m, attack range optimal
  readonly falloff: number; // m, attack range falloff
  readonly magazine: FighterMagazine | undefined; // undefined = unlimited (superiority/attack role)
  /** Per-fighter raw hp pools; undefined when the SDE carries no hp data (the squadron cannot be damaged). */
  readonly hp?: UnitPoolsSpec;
  readonly signatureRadius?: number; // m
}

export interface FighterRuntimeState {
  readonly positions: readonly Vec2[]; // individual fighter positions, alive fighters only
  readonly distanceToTarget: number; // m, group-average fighter-to-target
  readonly aliveCount: number; // fighters still flying in the squadron
  readonly hpFractions: readonly number[]; // remaining pooled hp fraction per alive fighter
}

export type WeaponSpec = TurretSpec | MissileSpec | DroneSpec | FighterSpec | VortonSpec;
export type WeaponKind = "turret" | "missile" | "drone" | "fighter" | "vorton";

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
  /** Set when the shot engaged a non-ship unit (the opponent's drone or fighter wing) instead of the ship. */
  readonly unitTarget?: UnitTargetKind;
}

export interface TurretDamageBreakdown {
  readonly hit: HitChanceBreakdown;
  readonly expectedMultiplier: number;
  readonly spoolFactor: number; // spool multiplier baked into nominalDps/volley; 1 for non-spooling turrets
  readonly inOptimal: boolean; // target within effective optimal; spooling turrets deactivate beyond it
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

export interface FighterDamageBreakdown {
  readonly application: number; // rangeFactor * missile application, 0..1
  readonly rangeFactor: number; // range strength factor; 1 when the fighter outruns the target
  readonly signatureTerm: number; // S/E
  readonly velocityTerm: number;
  readonly inRange: boolean; // target within optimal + 3*falloff (slow-fighter mode)
}

export interface VortonDamageBreakdown {
  readonly application: number; // missile explosion factor, 0..1
  readonly signatureTerm: number; // S/E
  readonly velocityTerm: number; // (S/E * Ve/Vt)^drf
  readonly inRange: boolean; // target within the hard maxRange cutoff
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

/** Position-independent inputs of an engagement frame; every kinematic field is derived from the relative motion. */
export interface RelativeMotion {
  readonly time: number;
  readonly shipA: ShipState;
  readonly shipB: ShipState;
  readonly relPosition: Vec2; // shipB.pos - shipA.pos
  readonly relVelocity: Vec2; // shipB.vel - shipA.vel
}

/** The single derivation of an engagement frame: radial/transversal decomposition and angular velocity stay mutually consistent by construction. */
export function deriveEngagementFrame(motion: RelativeMotion): EngagementFrame {
  const distance = motion.relPosition.len();
  const rHat = distance > 0 ? motion.relPosition.scale(1 / distance) : new Vec2(1, 0);
  const radialVelocity = motion.relVelocity.dot(rHat);
  const transversalVelocity = motion.relVelocity.sub(rHat.scale(radialVelocity));
  const transversalSpeed = transversalVelocity.len();
  const angularVelocity = distance > 0 ? transversalSpeed / distance : 0;
  return { time: motion.time, shipA: motion.shipA, shipB: motion.shipB, relPosition: motion.relPosition, distance, relVelocity: motion.relVelocity, radialVelocity, transversalVelocity, transversalSpeed, angularVelocity };
}

export interface HitChanceBreakdown {
  readonly chance: number; // 0..1
  readonly trackingTerm: number;
  readonly rangeTerm: number;
  readonly trackingPenalty: number; // 0.5 ** trackingTerm, 0 when infinite
  readonly rangePenalty: number; // 0.5 ** rangeTerm, 0 when infinite
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
  readonly capacitorNeed?: number;
  readonly cycleTime?: number;
}

export interface StasisGrapplerSpec {
  readonly moduleName: string;
  readonly moduleId: TypeId;
  readonly optimal: number;
  readonly falloff: number;
  readonly speedFactor: number;
  readonly overloadOptimalBonusPercent: number;
  readonly capacitorNeed?: number;
  readonly cycleTime?: number;
}

export interface TrackingDisruptorSpec {
  readonly moduleName: string;
  readonly moduleId: TypeId;
  readonly optimal: number;
  readonly falloff: number;
  readonly disruption: number;
  readonly defaultScript: DisruptionScriptSpec | undefined;
  readonly overloadStrengthBonusPercent: number;
  readonly capacitorNeed?: number;
  readonly cycleTime?: number;
}

export interface WarpScramblerSpec {
  readonly moduleName: string;
  readonly moduleId: TypeId;
  readonly maxRange: number;
  readonly overloadRangeBonusPercent: number;
  readonly capacitorNeed?: number;
  readonly cycleTime?: number;
  // Attr 1350 > 0: scramblers suppress MWD/AB; pure disruptors only drain capacitor.
  readonly propulsionBlock: boolean;
}

export interface TargetPainterSpec {
  readonly moduleName: string;
  readonly moduleId: TypeId;
  readonly maxRange: number;
  readonly falloff: number;
  readonly signatureRadiusBonusPercent: number;
  readonly overloadStrengthBonusPercent: number;
  readonly capacitorNeed?: number;
  readonly cycleTime?: number;
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
  readonly capacitorNeed?: number;
  readonly cycleTime?: number;
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
  readonly capacitorNeed?: number;
  readonly cycleTime?: number;
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

export interface CommandBurstSpec {
  readonly moduleName: string;
  readonly moduleId: TypeId;
  readonly capacitorNeed: number;
  readonly cycleTime: number;
  /** Timed percentage effects from the loaded burst charge; empty when the charge carries no modeled buff. */
  readonly effects: readonly BurstEffectSpec[];
}

/** Kinds of self-buff a command burst charge can apply; each kind maps to one EVE stacking-penalty group. */
export type BurstEffectKind = "shieldResonance" | "armorResonance" | "shieldHp" | "armorHp" | "shieldRepair" | "armorRepair" | "scanResolution" | "targetingRange" | "scanStrength" | "signatureRadius" | "inertia" | "propulsionSpeed";

/** A burst effect as a direct multiplier on the affected stat (e.g. 0.92 = -8% resonance). */
export interface BurstEffectSpec {
  readonly kind: BurstEffectKind;
  readonly multiplier: number;
}

/** Per-side aggregate of every live command burst effect: multiplier 1 = no effect. */
export type BurstModifiers = Readonly<Record<BurstEffectKind, number>>;

export const IDENTITY_BURST_MODIFIERS: BurstModifiers = {
  shieldResonance: 1, armorResonance: 1, shieldHp: 1, armorHp: 1, shieldRepair: 1, armorRepair: 1,
  scanResolution: 1, targetingRange: 1, scanStrength: 1, signatureRadius: 1, inertia: 1, propulsionSpeed: 1,
};

export type SensorType = "gravimetric" | "ladar" | "magnetometric" | "radar";

/** Ship sensor strengths in points; the racial type is the maximum. Gravimetric wins ties (multispectral profiles never occur on real hulls). */
export const SENSOR_TYPES: readonly SensorType[] = ["gravimetric", "ladar", "magnetometric", "radar"] as const;

export type SensorStrengths = Record<SensorType, number>;

export interface SensorSpec {
  readonly scanResolution: number;
  readonly maxTargetingRange: number;
  readonly maxLockedTargets: number;
  // Absent = legacy fixture without sensor data: ECM cannot jam it.
  readonly strengths?: SensorStrengths;
}

export interface JammerSpec {
  readonly moduleName: string;
  readonly moduleId: TypeId;
  readonly strengths: SensorStrengths;
  readonly optimal: number;
  readonly falloff: number;
  readonly overloadStrengthBonusPercent: number;
  readonly capacitorNeed: number;
  readonly cycleTime: number;
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
  readonly capacitorNeed?: number;
  readonly cycleTime?: number;
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
  readonly capacitorNeed?: number;
  readonly cycleTime?: number;
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

export interface EnergyNeutralizerSpec {
  readonly moduleName: string;
  readonly moduleId: TypeId;
  readonly amount: number; // GJ drained from the target per cycle
  readonly cycleTime: number;
  readonly capacitorNeed: number; // GJ consumed by the user per cycle
  readonly maxRange: number;
  readonly falloff: number;
}

export interface NosferatuSpec {
  readonly moduleName: string;
  readonly moduleId: TypeId;
  readonly amount: number; // GJ transferred per cycle
  readonly cycleTime: number;
  readonly maxRange: number;
  readonly falloff: number;
}

export interface EwarLoadout {
  readonly webs: readonly StasisWebSpec[];
  readonly grapplers: readonly StasisGrapplerSpec[];
  readonly disruptors: readonly TrackingDisruptorSpec[];
  readonly scramblers: readonly WarpScramblerSpec[];
  readonly painters: readonly TargetPainterSpec[];
  readonly dampeners: readonly SensorDampenerSpec[];
  readonly neutralizers: readonly EnergyNeutralizerSpec[];
  readonly nosferatu: readonly NosferatuSpec[];
  readonly scripts: readonly DisruptionScriptSpec[];
  readonly dampenerScripts: readonly SensorDampenerScriptSpec[];
  readonly jammers: readonly JammerSpec[];
}

export const EMPTY_EWAR_LOADOUT: EwarLoadout = { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], neutralizers: [], nosferatu: [], scripts: [], dampenerScripts: [], jammers: [] };

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

export interface NeutralizerActivation {
  readonly active: boolean;
}

export interface NosferatuActivation {
  readonly active: boolean;
}

export interface JammerActivation {
  readonly active: boolean;
  readonly overloaded: boolean;
}

export interface EwarActivation {
  readonly webs: readonly WebActivation[];
  readonly grapplers: readonly GrapplerActivation[];
  readonly disruptors: readonly DisruptorActivation[];
  readonly scramblers: readonly ScramblerActivation[];
  readonly painters: readonly PainterActivation[];
  readonly dampeners: readonly DampenerActivation[];
  readonly neutralizers: readonly NeutralizerActivation[];
  readonly nosferatu: readonly NosferatuActivation[];
  readonly jammers: readonly JammerActivation[];
}

export interface EwarProjection {
  readonly loadout: EwarLoadout;
  readonly activation?: EwarActivation;
}

export interface EwarReach {
  readonly web: number;
  readonly grappler: number;
  readonly scrambler: number;
  readonly disruptor: number;
  readonly painter: number;
  readonly dampener: number;
  readonly jammer: number;
  readonly neutralizer: number;
  readonly nosferatu: number;
}

export interface EwarEffectPotentials {
  readonly speedMultiplier: number;
  readonly sigMultiplier: number;
  readonly propulsionSuppressed: boolean;
  readonly trackingMultiplier: number;
  readonly optimalMultiplier: number;
  readonly falloffMultiplier: number;
  readonly scanResolutionMultiplier: number;
  readonly targetingRangeMultiplier: number;
}

export type EwarEffectFamily = "web" | "grappler" | "scrambler" | "disruptor" | "dampener" | "painter" | "neutralizer" | "nosferatu" | "jammer";

export type AppliedEwarEffect =
  | { readonly family: "web"; readonly moduleId: TypeId; readonly speedMultiplier: number }
  | { readonly family: "grappler"; readonly moduleId: TypeId; readonly speedMultiplier: number }
  | { readonly family: "scrambler"; readonly moduleId: TypeId }
  | { readonly family: "disruptor"; readonly moduleId: TypeId; readonly trackingMultiplier: number; readonly optimalMultiplier: number; readonly falloffMultiplier: number }
  | { readonly family: "dampener"; readonly moduleId: TypeId; readonly scanResolutionMultiplier: number; readonly maxTargetRangeMultiplier: number }
  | { readonly family: "painter"; readonly moduleId: TypeId; readonly signatureMultiplier: number }
  | { readonly family: "neutralizer"; readonly moduleId: TypeId; readonly amountPerCycle: number; readonly cycleTime: number }
  | { readonly family: "nosferatu"; readonly moduleId: TypeId; readonly amountPerCycle: number; readonly cycleTime: number }
  | { readonly family: "jammer"; readonly moduleId: TypeId; readonly cycleTime: number };

export type ActiveOffensiveModule =
  | { readonly category: "weapon"; readonly weaponKind: WeaponKind; readonly moduleId: TypeId }
  | ({ readonly category: "ewar" } & AppliedEwarEffect);

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

export interface DroneReadoutValues {
  readonly kind: "drone";
  readonly speed: number;
  readonly tracking: number;
  readonly optimal: number;
  readonly falloff: number;
  readonly sigResolution: number;
  readonly speedBreakdown?: SpeedBreakdown;
}

export interface FighterReadoutValues {
  readonly kind: "fighter";
  readonly speed: number;
  readonly maxVelocity: number;
  readonly optimal: number;
  readonly falloff: number;
  readonly explosionRadius: number;
  readonly explosionVelocity: number;
  readonly speedBreakdown?: SpeedBreakdown;
}

export interface NoWeaponReadoutValues {
  readonly kind: "none";
  readonly speed: number;
  readonly speedBreakdown?: SpeedBreakdown;
}

export type SideReadoutValues = TurretReadoutValues | MissileReadoutValues | DroneReadoutValues | FighterReadoutValues | NoWeaponReadoutValues;

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
  readonly commandBursts?: readonly CommandBurstSpec[];
  /** Weapon-allocation preference: this side's turrets engage the opponent's drone/fighter wing instead of the ship. */
  readonly attackDrones?: boolean;
  // Capacitor pool spec. Absent = the combatant never starves (legacy fixtures).
  readonly capacitor?: CapacitorSpec;
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

/** A fitted active resist module (shield/armor hardener): pays capacitorNeed every cycleTime; a starved hardener drops offline and its bonus is lost. */
export interface ActiveHardenerSpec {
  readonly moduleId: TypeId;
  readonly layer: DefenseLayer;
  /** Per-type resist bonus with compensation skills applied, before overload. */
  readonly resistBonus: DamageResists;
  readonly overloadBonusMultiplier: number;
  readonly capacitorNeed: number; // GJ per cycle
  readonly cycleTime: number; // seconds
  // Per-module HP loss per completed overloaded cycle; absent = hardener cannot take heat damage.
  readonly heatDamage?: number;
}

export interface RahSpec {
  readonly cycleTime: number;
  readonly shiftAmount: number;
  readonly baseResists: DamageResists;
  readonly overloadCycleTimeMultiplier: number;
  readonly capacitorNeed?: number;
  readonly moduleId?: TypeId;
}

export interface DefenseSpec {
  readonly layers: Readonly<Record<DefenseLayer, DefenseLayerSpec>>;
  /** Layer resists with every fitted active hardener offline: base hull, passive coatings, damage control, hull bonuses, skills. */
  readonly baseResists: Readonly<Record<DefenseLayer, DamageResists>>;
  /** Fitted active hardeners. layers[].resists is the all-on composition of baseResists and these. */
  readonly hardeners: readonly ActiveHardenerSpec[];
  readonly shieldRechargeTime: number;
  readonly repairers: readonly RepairerSpec[];
  readonly signaturePenalty: number;
  readonly rah?: RahSpec;
  readonly shieldUniformity: number; // 0..0.25, bleed-through threshold from TSM skill
}

export interface CapacitorSpec {
  readonly capacity: number; // GJ
  readonly rechargeTime: number; // seconds, 0 -> 98.7% advertised recharge time
}

export type CapBoosterMode = "auto" | "manual";

export interface ScheduledDrain {
  readonly moduleId: TypeId;
  readonly amount: number; // GJ per cycle
  readonly interval: number; // seconds between debits
  readonly active: boolean;
}

/** Per-frame engagement facts the engine derives from geometry and lock state: modules unable to act on the target are excluded from cap consumption. */
export interface CapacitorEngagement {
  /** False while the side's ship is destroyed: the pool freezes (no regen, no debits, no timers). */
  readonly operational: boolean;
  readonly propulsionSuppressed: boolean;
  readonly weaponsEngaged: boolean;
  /** Module ids of this side's own hard-range modules currently applying nothing to the target (family granularity). */
  readonly disengagedModuleIds: readonly TypeId[];
}

/** Projected cap-warfare debit on one side, built by the engine from the opponent's applied effects. */
export interface IncomingDrain {
  readonly moduleId: TypeId;
  readonly amount: number; // GJ per cycle, falloff and target resistance already applied
  readonly interval: number; // seconds between debits
  readonly transfer: boolean; // nosferatu: debit credits the opponent pool
  readonly count: number; // aggregated module instances represented by this entry
}

export interface CapBoosterSimSpec {
  readonly moduleId: TypeId;
  readonly amount: number; // GJ per charge
  readonly cycleTime: number; // seconds between injections
  readonly clipSize: number;
  readonly reloadTime: number; // seconds
  readonly mode: CapBoosterMode;
}

export interface CapacitorSideConfig {
  readonly infinite: boolean;
  readonly drains: readonly ScheduledDrain[];
  readonly boosters: readonly CapBoosterSimSpec[];
  /** Deterministic fitted cost in GJ/s (the stat-side usage: every fitted active module's amount/interval). Readout basis for the net, pyfa capUsed semantics. */
  readonly fittedDrainPerSecond: number;
  /** The lock-gated weapons subset of fittedDrainPerSecond (turrets; missiles and drones cost nothing). Subtracted from the net while no target lock is held. */
  readonly weaponsDrainPerSecond: number;
  // Active propulsion module drain (skill-modified amount and interval). Absent = no debit.
  readonly propulsion?: CapacitorPropulsionDrain;
}

export interface CapacitorPropulsionDrain {
  readonly moduleId: TypeId;
  readonly amount: number; // GJ per cycle
  readonly interval: number; // seconds between debits
}

export const ZERO_RESISTS: DamageResists = { em: 0, thermal: 0, kinetic: 0, explosive: 0 };

export const EMPTY_DEFENSE_SPEC: DefenseSpec = {
  layers: {
    shield: { hp: 0, resists: ZERO_RESISTS },
    armor: { hp: 0, resists: ZERO_RESISTS },
    hull: { hp: 0, resists: ZERO_RESISTS },
  },
  baseResists: { shield: ZERO_RESISTS, armor: ZERO_RESISTS, hull: ZERO_RESISTS },
  hardeners: [],
  shieldRechargeTime: 0,
  repairers: [],
  signaturePenalty: 0,
  shieldUniformity: 0.25,
};
