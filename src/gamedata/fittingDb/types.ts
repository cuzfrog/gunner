import type { ShipId, TypeId } from "../ids";
import type { HullTier } from "../../ships";
import type { DamageResists } from "../../sim";

export interface FittingPropulsionStats {
  readonly kind: "afterburner" | "microwarpdrive";
  readonly sizeTier: HullTier;
  readonly thrust: number;
  readonly speedBonus: number;
  readonly massAddition: number;
  readonly sigBloom: number;
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

export interface FittingModuleStats {
  readonly massAddition?: number;
  readonly massBonusPercentage?: number;
  readonly speedBonusPercent?: number;
  readonly agilityMultiplier?: number;
  readonly sigRadiusAdd?: number;
  readonly sigBonusPercent?: number;
  readonly sigDrawbackPercent?: number;
  readonly agilityDrawbackPercent?: number;
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
  readonly sensorDampener?: Omit<SensorDampenerStats, "id" | "name">;
  readonly sensorBooster?: Omit<SensorBoosterStats, "id" | "name">;
  readonly signalAmplifier?: Omit<SignalAmplifierStats, "id" | "name">;
  readonly missileDamageMultiplier?: number;
  readonly missileCycleTimeMultiplier?: number;
  readonly droneDamageBonus?: number;
  readonly droneControlRangeBonus?: number;
  readonly defense?: DefenseModuleStats;
  readonly id: TypeId;
  readonly name: string;
}

export type TurretWeaponGroup = "Energy Weapon" | "Hybrid Weapon" | "Projectile Weapon";

export interface TurretStats {
  readonly tracking: number;
  readonly optimal: number;
  readonly falloff: number;
  readonly chargeSize: number;
  readonly damageMultiplier: number;
  readonly cycleTime: number;
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
export type TurretBonusAttribute = "turretTracking" | "turretOptimal" | "turretFalloff" | "turretDamage" | "turretRoF";
export type MissileBonusAttribute = "missileDamage" | "missileRoF" | "missileVelocity" | "missileFlightTime" | "missileExplosionRadius" | "missileExplosionVelocity";
export type DroneBonusAttribute = "droneDamage";
export type DefenseBonusAttribute = "armorResist" | "shieldResist" | "shieldHpPercent" | "armorHpPercent" | "hullHpPercent" | "plateHpPercent" | "extenderHpPercent";
export type HullBonusAttribute = PropulsionBonusAttribute | TurretBonusAttribute | MissileBonusAttribute | DroneBonusAttribute | DefenseBonusAttribute;

export interface HullBonus {
  readonly attribute: HullBonusAttribute;
  readonly magnitude: number;
  readonly scalesWithHullSkill: boolean;
  readonly chargeSkillId?: TypeId;
  readonly moduleSkillId?: TypeId;
  readonly moduleGroupId?: number;
}

export type SkillBonusType = "turretDamage" | "turretRoF" | "turretTracking" | "turretOptimal" | "turretFalloff" | "missileDamage" | "missileRoF" | "missileVelocity" | "missileFlightTime" | "missileExplosionRadius" | "missileExplosionVelocity";

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
  readonly id: TypeId;
  readonly name: string;
}

export interface StasisGrapplerStats {
  readonly optimal: number;
  readonly falloff: number;
  readonly speedFactorPercent: number;
  readonly overloadOptimalBonusPercent: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface TrackingDisruptorStats {
  readonly optimal: number;
  readonly falloff: number;
  readonly disruptionPercent: number;
  readonly overloadStrengthBonusPercent: number;
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
  readonly id: TypeId;
  readonly name: string;
}

export interface TrackingComputerStats {
  readonly trackingBonusPercent: number;
  readonly optimalBonusPercent: number;
  readonly falloffBonusPercent: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface TargetPainterStats {
  readonly maxRange: number;
  readonly falloff: number;
  readonly signatureRadiusBonusPercent: number;
  readonly overloadStrengthBonusPercent: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface MissileGuidanceComputerStats {
  readonly explosionRadiusBonusPercent: number;
  readonly explosionVelocityBonusPercent: number;
  readonly missileVelocityBonusPercent: number;
  readonly flightTimeBonusPercent: number;
  readonly overloadStrengthBonusPercent: number;
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
  readonly overloadStrengthBonusPercent: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface OmnidirectionalTrackingEnhancerStats {
  readonly trackingBonusPercent: number;
  readonly optimalBonusPercent: number;
  readonly falloffBonusPercent: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface SensorDampenerStats {
  readonly optimal: number;
  readonly falloff: number;
  readonly scanResolutionBonusPercent: number;
  readonly maxTargetRangeBonusPercent: number;
  readonly overloadStrengthBonusPercent: number;
  readonly id: TypeId;
  readonly name: string;
}

export interface SensorBoosterStats {
  readonly scanResolutionBonusPercent: number;
  readonly maxTargetRangeBonusPercent: number;
  readonly overloadStrengthBonusPercent: number;
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
  readonly id: TypeId;
  readonly name: string;
}

export interface FittingDbData {
  readonly modules: Readonly<Record<string, FittingModuleStats>>;
  readonly turrets: Readonly<Record<string, TurretStats>>;
  readonly charges: Readonly<Record<string, ChargeStats>>;
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
  readonly skillBonuses: readonly SkillBonus[];
  readonly drones: Readonly<Record<string, { readonly id: TypeId; readonly name: string }>>;
  readonly combatDrones: Readonly<Record<string, DroneStats>>;
}

export type FittingDb = FittingDbData;
