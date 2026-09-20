import type { ShipId, TypeId } from "../ids";
import type { HullTier } from "../../ships";
import type { DamageResists, DamageType, SensorStrengths } from "../../sim";

export interface FittingPropulsionStats {
  readonly kind: "afterburner" | "microwarpdrive";
  readonly sizeTier: HullTier;
  readonly thrust: number;
  readonly speedBonus: number;
  readonly capacitorNeed: number; // GJ per cycle
  readonly cycleTime: number; // seconds (attr 73)
  readonly requiredSkillIds: readonly TypeId[];
  readonly massAddition: number;
  readonly sigBloom: number;
  readonly capacitorCapacityMultiplier?: number; // MWD capacitor capacity penalty, e.g. 0.75 for -25%
}

export type DefenseLayer = "shield" | "armor" | "hull";

export interface DefenseRepairerOverload {
  readonly amountMultiplier: number;
  readonly cycleTimeMultiplier: number;
}

export interface DefenseAncillary {
  readonly chargeMultiplier: number;
  readonly shots: number;
  readonly reloadTime: number;
}

export interface DefenseModuleStats {
  readonly kind: "damageControl" | "rah" | "repairer" | "boostAmplifier" | "resistModule" | "shieldExtender" | "armorPlate" | "rechargeModule" | "hullBulkhead" | "hpPercent" | "rechargeAmplifier" | "repairAmplifier";
  readonly layer?: DefenseLayer;
  readonly active?: boolean;
  readonly resistBonus?: DamageResists;
  readonly compensationApplies?: boolean;
  readonly overloadBonusMultiplier?: number;
  readonly shieldResists?: DamageResists;
  readonly armorResists?: DamageResists;
  readonly hullResists?: DamageResists;
  readonly baseArmorResists?: DamageResists;
  readonly resistanceShiftAmount?: number;
  readonly amount?: number;
  readonly cycleTime?: number;
  readonly capacitorNeed?: number;
  readonly heatDamage?: number;
  readonly overload?: DefenseRepairerOverload;
  readonly overloadCycleTimeMultiplier?: number;
  readonly ancillary?: DefenseAncillary;
  readonly multiplier?: number;
  readonly shieldHpAdd?: number;
  readonly armorHpAdd?: number;
  readonly hullHpPercent?: number;
  readonly hpPercent?: number;
  readonly sigRadiusPenalty?: number;
  readonly rechargeMultiplier?: number;
  readonly repairAmountMultiplier?: number;
  readonly repairCycleTimeMultiplier?: number;
}

export type CapacitorModuleKind = "capacitorBattery" | "capacitorRecharger" | "capacitorRelay" | "powerDiagnostic" | "capacitorFluxCoil" | "capacitorBooster";

export interface CapacitorModuleStats {
  readonly kind: CapacitorModuleKind;
  readonly capacityAdd?: number; // GJ, batteries
  readonly capacityMultiplier?: number; // PDS 1.05, flux coil 0.8
  readonly rechargeMultiplier?: number; // recharger 0.8, CPL 0.76, PDS 0.915, flux coil 0.61
  readonly energyWarfareResistanceBonus?: number; // raw SDE percent, batteries (-25)
  readonly cycleTime?: number; // seconds, booster only
  readonly reloadTime?: number; // seconds, booster only
  readonly chargeCapacity?: number; // m3, booster only; clip = floor(chargeCapacity / charge volume)
}

export interface EnergyNeutralizerStats {
  readonly amount: number; // GJ drained from the target per cycle
  readonly cycleTime: number; // seconds
  readonly capacitorNeed: number; // GJ consumed by the user per cycle
  readonly maxRange: number; // m
  readonly falloff: number; // m
  readonly requiredSkillIds: readonly TypeId[];
}

export interface NosferatuStats {
  readonly amount: number; // GJ transferred per cycle
  readonly cycleTime: number; // seconds
  readonly maxRange: number; // m
  readonly falloff: number; // m
}

export type RigDrawbackKind = "signature" | "agility" | "armorHp" | "shieldHp" | "cpu" | "cpuNeed" | "powerNeed" | "capacitorRecharge" | "cargoCapacity" | "warpSpeed" | "repairPowerGrid";

export interface RigDrawback {
  readonly kind: RigDrawbackKind;
  readonly percent: number;
  readonly groupId: number;
  // Scope of need drawbacks (powerNeed/cpuNeed): the affected module group or required skill. Undefined for other kinds.
  readonly targetGroupId?: number;
  readonly targetSkillId?: TypeId;
}

export interface RigDrawbackReduction {
  readonly skillId: TypeId;
  readonly groupId: number;
  readonly magnitudePerLevel: number;
}

export interface FittingModuleStats {
  readonly massAddition?: number;
  readonly massBonusPercentage?: number;
  readonly speedBonusPercent?: number;
  readonly agilityMultiplier?: number;
  readonly sigRadiusAdd?: number;
  readonly sigBonusPercent?: number;
  readonly rigDrawback?: RigDrawback;
  readonly powerGridOutputPercent?: number;
  readonly cpuOutputPercent?: number;
  readonly requiredSkillIds?: readonly TypeId[];
  readonly groupID?: number;
  readonly turretTrackingPercent?: number;
  readonly turretOptimalPercent?: number;
  readonly turretFalloffPercent?: number;
  readonly turretDamageMultiplier?: number;
  readonly turretSpeedMultiplier?: number;
  readonly turretWeaponGroup?: TurretWeaponGroup;
  readonly propulsion?: FittingPropulsionStats;
  readonly stasisWeb?: Omit<StasisWebStats, "id" | "name">;
  readonly stasisGrappler?: Omit<StasisGrapplerStats, "id" | "name">;
  readonly trackingDisruptor?: Omit<TrackingDisruptorStats, "id" | "name">;
  readonly warpScrambler?: Omit<WarpScramblerStats, "id" | "name">;
  readonly targetPainter?: Omit<TargetPainterStats, "id" | "name">;
  readonly jammer?: Omit<JammerStats, "id" | "name">;
  readonly sensorDampener?: Omit<SensorDampenerStats, "id" | "name">;
  readonly sensorBooster?: Omit<SensorBoosterStats, "id" | "name">;
  readonly signalAmplifier?: Omit<SignalAmplifierStats, "id" | "name">;
  readonly missileDamageMultiplier?: number;
  readonly missileCycleTimeMultiplier?: number;
  readonly droneDamageBonus?: number;
  readonly droneControlRangeBonus?: number;
  readonly defense?: DefenseModuleStats;
  readonly capacitor?: CapacitorModuleStats;
  readonly neutralizer?: EnergyNeutralizerStats;
  readonly nosferatu?: NosferatuStats;
  readonly id: TypeId;
  readonly name: string;
}

export const ENERGY_WEAPON_GROUP = 53;
export const PROJECTILE_WEAPON_GROUP = 55;
export const HYBRID_WEAPON_GROUP = 74;
export const PRECURSOR_WEAPON_GROUP = 1986;

export type TurretWeaponGroup = "Energy Weapon" | "Hybrid Weapon" | "Projectile Weapon" | "Precursor Weapon";

export const TURRET_WEAPON_GROUP_BY_ID: Readonly<Record<number, TurretWeaponGroup>> = {
  [ENERGY_WEAPON_GROUP]: "Energy Weapon",
  [PROJECTILE_WEAPON_GROUP]: "Projectile Weapon",
  [HYBRID_WEAPON_GROUP]: "Hybrid Weapon",
  [PRECURSOR_WEAPON_GROUP]: "Precursor Weapon",
};

export function turretWeaponGroupForGroupId(groupId: number): TurretWeaponGroup | undefined {
  return TURRET_WEAPON_GROUP_BY_ID[groupId];
}

export interface TurretStats {
  readonly tracking: number;
  readonly optimal: number;
  readonly falloff: number;
  readonly chargeSize: number;
  readonly chargeGroups: readonly number[];
  readonly damageMultiplier: number;
  readonly cycleTime: number;
  readonly capacitorNeed: number; // GJ per cycle per turret
  readonly spoolPerCycle?: number; // damageMultiplierBonusPerCycle, fraction (e.g. 0.07)
  readonly spoolMax?: number; // damageMultiplierBonusMax, fraction (e.g. 2.125)
  readonly turretSkill?: string;
  readonly specializationSkill?: string;
  readonly requiredSkillIds: readonly TypeId[];
  readonly groupID: number;
  readonly metaLevel: number;
  readonly metaGroupID: number;
  readonly id: TypeId;
  readonly name: string;
}

export type PropulsionBonusAttribute = "maxVelocity" | "agility" | "mwdSigBloom";
export type ShipOutputBonusAttribute = "powerGridOutputPercent" | "cpuOutputPercent";
export type TurretBonusAttribute = "turretTracking" | "turretOptimal" | "turretFalloff" | "turretDamage" | "turretRoF" | "turretSpoolMax";
export type MissileBonusAttribute = "missileDamage" | "missileRoF" | "missileVelocity" | "missileFlightTime" | "missileExplosionRadius" | "missileExplosionVelocity";
export type DroneBonusAttribute = "droneDamage";
export type FighterBonusAttribute = "fighterDamage";
export type DefenseBonusAttribute = "armorResist" | "shieldResist" | "shieldHpPercent" | "armorHpPercent" | "hullHpPercent" | "plateHpPercent" | "extenderHpPercent";
export type ModuleBonusAttribute = "capUse" | "duration" | "cpuNeed" | "powerGridNeed";
// Flat additions applied to the base ship stat before percent modifiers (strategic cruiser subsystems).
export type ShipStatFlatAttribute = "shieldHpFlat" | "armorHpFlat" | "hullHpFlat" | "capacitorCapacityFlat" | "sigRadiusFlat" | "maxTargetingRangeFlat" | "droneCapacityFlat" | "droneBandwidthFlat" | "powerGridFlat" | "cpuFlat";
export type HullBonusAttribute = PropulsionBonusAttribute | ShipOutputBonusAttribute | TurretBonusAttribute | MissileBonusAttribute | DroneBonusAttribute | FighterBonusAttribute | DefenseBonusAttribute | ModuleBonusAttribute | ShipStatFlatAttribute;

export interface HullBonus {
  readonly attribute: HullBonusAttribute;
  readonly magnitude: number;
  readonly scalesWithHullSkill: boolean;
  readonly chargeSkillId?: TypeId;
  readonly moduleSkillId?: TypeId;
  readonly moduleGroupId?: number;
  // Per-type damage bonus (from missile damage attrs 114/116/117/118); undefined = whole volley.
  readonly damageType?: DamageType;
  // Subsystem item the bonus originates from; undefined = ship hull bonus.
  readonly sourceId?: TypeId;
}

export type SkillBonusType = "turretDamage" | "turretRoF" | "turretTracking" | "turretOptimal" | "turretFalloff" | "missileDamage" | "missileRoF" | "missileVelocity" | "missileFlightTime" | "missileExplosionRadius" | "missileExplosionVelocity" | "droneDamage" | "droneOptimal" | "droneVelocity" | "fighterDamage" | "fighterOptimal" | "fighterVelocity" | ModuleBonusAttribute;

export interface SkillBonus {
  readonly skillId: TypeId;
  readonly bonusType: SkillBonusType;
  readonly magnitudePerLevel: number;
  readonly requiredSkillId?: TypeId;
  readonly moduleGroupId?: number;
  readonly appliesTo: "module" | "charge";
}

export interface ChargeStats {
  readonly trackingMultiplier?: number;
  readonly rangeMultiplier?: number;
  readonly falloffMultiplier?: number;
  readonly emDamage?: number;
  readonly thermalDamage?: number;
  readonly kineticDamage?: number;
  readonly explosiveDamage?: number;
  readonly capacitorBonus?: number; // GJ injected per cycle, cap booster charges
  readonly volume?: number; // m3, cap booster charges
  readonly capacitorNeedMultiplier?: number; // turret capacitor need scaling from the charge (attr 317), e.g. 1.25 Conflagration
  readonly warfareBuffId?: number; // raw SDE warfareBuff1ID, command burst charges
  readonly warfareBuffMultiplier?: number; // raw SDE warfareBuff1Multiplier percent, command burst charges
  readonly chargeGroup: number;
  readonly chargeSize: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface LauncherStats {
  readonly rateOfFire: number;
  readonly launcherGroup: number;
  readonly chargeGroups: readonly number[];
  readonly requiredSkillIds: readonly TypeId[];
  readonly metaLevel: number;
  readonly metaGroupID: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface MissileStats {
  readonly damage: number;
  readonly damageType: "em" | "thermal" | "kinetic" | "explosive";
  readonly explosionRadius: number;
  readonly explosionVelocity: number;
  readonly damageReductionFactor: number;
  readonly maxVelocity: number;
  readonly flightTime: number;
  readonly launcherGroup: number;
  readonly chargeGroup: number;
  readonly requiredSkillIds: readonly TypeId[];
  readonly id: TypeId;
  readonly name: string;
}

export interface TurretScriptStats {
  readonly trackingMultiplier: number;
  readonly optimalMultiplier: number;
  readonly falloffMultiplier: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface StasisWebStats {
  readonly maxRange: number;
  readonly speedFactorPercent: number;
  readonly overloadRangeBonusPercent: number;
  readonly capacitorNeed: number; // GJ per cycle
  readonly cycleTime: number; // seconds
  readonly requiredSkillIds: readonly TypeId[];
  readonly id: TypeId;
  readonly name: string;
}

export interface StasisGrapplerStats {
  readonly optimal: number;
  readonly falloff: number;
  readonly speedFactorPercent: number;
  readonly overloadOptimalBonusPercent: number;
  readonly capacitorNeed: number; // GJ per cycle
  readonly cycleTime: number; // seconds
  readonly requiredSkillIds: readonly TypeId[];
  readonly id: TypeId;
  readonly name: string;
}

export interface TrackingDisruptorStats {
  readonly optimal: number;
  readonly falloff: number;
  readonly disruptionPercent: number;
  readonly overloadStrengthBonusPercent: number;
  readonly capacitorNeed: number; // GJ per cycle
  readonly cycleTime: number; // seconds
  readonly requiredSkillIds: readonly TypeId[];
  readonly id: TypeId;
  readonly name: string;
}

export interface DisruptionScriptStats {
  readonly trackingDeltaBonus: number;
  readonly rangeDeltaBonus: number;
  readonly falloffDeltaBonus: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface WarpScramblerStats {
  readonly maxRange: number;
  readonly overloadRangeBonusPercent: number;
  readonly capacitorNeed: number; // GJ per cycle
  readonly cycleTime: number; // seconds
  readonly propulsionBlock: boolean; // attr 1350 > 0: scramblers suppress propulsion; pure disruptors do not
  readonly requiredSkillIds: readonly TypeId[];
  readonly id: TypeId;
  readonly name: string;
}

export interface TrackingComputerStats {
  readonly trackingBonusPercent: number;
  readonly optimalBonusPercent: number;
  readonly falloffBonusPercent: number;
  readonly capacitorNeed: number; // GJ per cycle
  readonly cycleTime: number; // seconds
  readonly requiredSkillIds: readonly TypeId[];
  readonly id: TypeId;
  readonly name: string;
}

export interface TargetPainterStats {
  readonly maxRange: number;
  readonly falloff: number;
  readonly signatureRadiusBonusPercent: number;
  readonly overloadStrengthBonusPercent: number;
  readonly capacitorNeed: number; // GJ per cycle
  readonly cycleTime: number; // seconds
  readonly requiredSkillIds: readonly TypeId[];
  readonly id: TypeId;
  readonly name: string;
}

export interface JammerStats {
  readonly strengths: SensorStrengths;
  readonly optimal: number; // m
  readonly falloff: number; // m
  readonly overloadStrengthBonusPercent: number;
  readonly capacitorNeed: number; // GJ per cycle
  readonly cycleTime: number; // seconds
  readonly requiredSkillIds: readonly TypeId[];
  readonly id: TypeId;
  readonly name: string;
}

export interface MissileGuidanceComputerStats {
  readonly explosionRadiusBonusPercent: number;
  readonly explosionVelocityBonusPercent: number;
  readonly missileVelocityBonusPercent: number;
  readonly flightTimeBonusPercent: number;
  readonly overloadStrengthBonusPercent: number;
  readonly capacitorNeed: number; // GJ per cycle
  readonly cycleTime: number; // seconds
  readonly requiredSkillIds: readonly TypeId[];
  readonly id: TypeId;
  readonly name: string;
}

export interface MissileGuidanceEnhancerStats {
  readonly explosionRadiusBonusPercent: number;
  readonly explosionVelocityBonusPercent: number;
  readonly missileVelocityBonusPercent: number;
  readonly flightTimeBonusPercent: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface MissileScriptStats {
  readonly explosionRadiusMultiplier: number;
  readonly explosionVelocityMultiplier: number;
  readonly missileVelocityMultiplier: number;
  readonly flightTimeMultiplier: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface OmnidirectionalTrackingLinkStats {
  readonly trackingBonusPercent: number;
  readonly optimalBonusPercent: number;
  readonly falloffBonusPercent: number;
  readonly aoeVelocityBonusPercent: number;
  readonly aoeCloudSizeBonusPercent: number;
  readonly overloadStrengthBonusPercent: number;
  readonly capacitorNeed: number; // GJ per cycle
  readonly cycleTime: number; // seconds
  readonly id: TypeId;
  readonly name: string;
}

export interface OmnidirectionalTrackingEnhancerStats {
  readonly trackingBonusPercent: number;
  readonly optimalBonusPercent: number;
  readonly falloffBonusPercent: number;
  readonly aoeVelocityBonusPercent: number;
  readonly aoeCloudSizeBonusPercent: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface SensorDampenerStats {
  readonly optimal: number;
  readonly falloff: number;
  readonly scanResolutionBonusPercent: number;
  readonly maxTargetRangeBonusPercent: number;
  readonly overloadStrengthBonusPercent: number;
  readonly capacitorNeed: number; // GJ per cycle
  readonly cycleTime: number; // seconds
  readonly requiredSkillIds: readonly TypeId[];
  readonly id: TypeId;
  readonly name: string;
}

export interface SensorBoosterStats {
  readonly scanResolutionBonusPercent: number;
  readonly maxTargetRangeBonusPercent: number;
  readonly overloadStrengthBonusPercent: number;
  readonly capacitorNeed: number; // GJ per cycle
  readonly cycleTime: number; // seconds
  readonly requiredSkillIds: readonly TypeId[];
  readonly id: TypeId;
  readonly name: string;
}

export interface SignalAmplifierStats {
  readonly scanResolutionBonusPercent: number;
  readonly maxTargetRangeBonusPercent: number;
  readonly maxLockedTargetsBonus: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface SensorBoosterScriptStats {
  readonly scanResolutionMultiplier: number;
  readonly maxTargetRangeMultiplier: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface SensorDampenerScriptStats {
  readonly scanResolutionMultiplier: number;
  readonly maxTargetRangeMultiplier: number;
  readonly id: TypeId;
  readonly name: string;
}

export type DroneSizeClass = "light" | "medium" | "heavy" | "sentry";

export type FighterKind = "light" | "heavy" | "support";

/** One fighter attack ability (missile-typed); every published damage fighter uses missiles. */
export interface FighterAttackStats {
  readonly emDamage: number;
  readonly thermalDamage: number;
  readonly kineticDamage: number;
  readonly explosiveDamage: number;
  readonly damageMultiplier: number;
  readonly cycleTime: number; // seconds
  readonly explosionRadius: number; // m
  readonly explosionVelocity: number; // m/s
  readonly damageReductionFactor: number;
  readonly damageReductionSensitivity: number;
  readonly optimal: number; // m
  readonly falloff: number; // m
  readonly numShots: number; // squadron magazine size, 0 = unlimited
  readonly rearmTime: number; // seconds per spent shot
}

export interface FighterStats {
  readonly kind: FighterKind;
  readonly squadronMaxSize: number;
  readonly orbitRange: number; // m
  readonly maxVelocity: number; // m/s
  readonly signatureRadius: number; // m
  readonly refuelingTime: number; // seconds per refuel cycle
  readonly volume: number; // m3 per fighter
  readonly attack?: FighterAttackStats;
  readonly metaLevel: number;
  readonly metaGroupID: number;
  readonly requiredSkillIds: readonly TypeId[];
  readonly id: TypeId;
  readonly name: string;
}

export interface DroneStats {
  readonly sizeClass: DroneSizeClass;
  readonly damageMultiplier: number;
  readonly emDamage: number;
  readonly thermalDamage: number;
  readonly kineticDamage: number;
  readonly explosiveDamage: number;
  readonly tracking: number;
  readonly sigResolution: number;
  readonly optimal: number;
  readonly falloff: number;
  readonly maxVelocity: number;
  readonly orbitSpeed: number;
  readonly orbitRange: number;
  readonly cycleTime: number;
  readonly bandwidth: number;
  readonly volume: number;
  readonly metaLevel: number;
  readonly metaGroupID: number;
  readonly requiredSkillIds: readonly TypeId[];
  readonly id: TypeId;
  readonly name: string;
}

export interface CommandBurstStats {
  readonly maxRange: number; // m, fleet-wide effect radius
  readonly cycleTime: number; // seconds, burst reapplies every cycle
  readonly capacitorNeed: number; // GJ consumed by the user per cycle
  readonly reloadTime: number; // seconds, charge consumption between cycles
  readonly chargeGroup: number; // accepted charge family (shield/armor/skirmish/information/mining)
  readonly requiredSkillIds: readonly TypeId[];
  readonly id: TypeId;
  readonly name: string;
}

export interface SubsystemStats {
  readonly id: TypeId;
  readonly name: string;
  readonly slotKind: SubsystemSlotKind;
  readonly highSlots: number;
  readonly medSlots: number;
  readonly lowSlots: number;
  readonly turretHardpoints: number;
  readonly launcherHardpoints: number;
  readonly requiredSkillIds: readonly TypeId[];
}

export type SubsystemSlotKind = "core" | "offensive" | "defensive" | "propulsion";

/** Ship powergrid/CPU fitting resources: used by fitted modules versus the ship's modified output. */
export interface FittingResource {
  readonly used: number;
  readonly output: number;
}

export interface FittingResources {
  readonly powerGrid: FittingResource;
  readonly cpu: FittingResource;
}

/** Per-type powergrid (MW) and CPU (tf) needs of a fittable item. */
export interface ModuleFittingNeeds {
  readonly powerGrid: number;
  readonly cpu: number;
}

export interface FittingDbData {
  readonly modules: Readonly<Record<string, FittingModuleStats>>;
  readonly needs: Readonly<Record<string, ModuleFittingNeeds>>;
  readonly turrets: Readonly<Record<string, TurretStats>>;
  readonly charges: Readonly<Record<string, ChargeStats>>;
  readonly commandBursts: Readonly<Record<string, CommandBurstStats>>;
  readonly subsystems: Readonly<Record<string, SubsystemStats>>;
  readonly launchers: Readonly<Record<string, LauncherStats>>;
  readonly missiles: Readonly<Record<string, MissileStats>>;
  readonly scripts: Readonly<Record<string, TurretScriptStats>>;
  readonly stasisWebs: Readonly<Record<string, StasisWebStats>>;
  readonly stasisGrapplers: Readonly<Record<string, StasisGrapplerStats>>;
  readonly trackingComputers: Readonly<Record<string, TrackingComputerStats>>;
  readonly trackingDisruptors: Readonly<Record<string, TrackingDisruptorStats>>;
  readonly warpScramblers: Readonly<Record<string, WarpScramblerStats>>;
  readonly disruptionScripts: Readonly<Record<string, DisruptionScriptStats>>;
  readonly targetPainters: Readonly<Record<string, TargetPainterStats>>;
  readonly jammers: Readonly<Record<string, JammerStats>>;
  readonly missileGuidanceComputers: Readonly<Record<string, MissileGuidanceComputerStats>>;
  readonly missileGuidanceEnhancers: Readonly<Record<string, MissileGuidanceEnhancerStats>>;
  readonly missileScripts: Readonly<Record<string, MissileScriptStats>>;
  readonly omnidirectionalTrackingLinks: Readonly<Record<string, OmnidirectionalTrackingLinkStats>>;
  readonly omnidirectionalTrackingEnhancers: Readonly<Record<string, OmnidirectionalTrackingEnhancerStats>>;
  readonly sensorDampeners: Readonly<Record<string, SensorDampenerStats>>;
  readonly sensorBoosters: Readonly<Record<string, SensorBoosterStats>>;
  readonly signalAmplifiers: Readonly<Record<string, SignalAmplifierStats>>;
  readonly sensorBoosterScripts: Readonly<Record<string, SensorBoosterScriptStats>>;
  readonly sensorDampenerScripts: Readonly<Record<string, SensorDampenerScriptStats>>;
  readonly hullBonuses: Readonly<Record<ShipId, readonly HullBonus[]>>;
  readonly subsystemBonuses: Readonly<Record<string, readonly HullBonus[]>>;
  readonly skillBonuses: readonly SkillBonus[];
  readonly rigDrawbackReductions: readonly RigDrawbackReduction[];
  readonly drones: Readonly<Record<string, { readonly id: TypeId; readonly name: string }>>;
  readonly combatDrones: Readonly<Record<string, DroneStats>>;
  readonly fighters: Readonly<Record<string, FighterStats>>;
}

export type FittingDb = FittingDbData;

export type EwarDb = Pick<FittingDbData, "stasisWebs" | "stasisGrapplers" | "trackingDisruptors" | "warpScramblers" | "targetPainters" | "sensorDampeners" | "sensorDampenerScripts" | "disruptionScripts" | "jammers" | "modules" | "skillBonuses">;
