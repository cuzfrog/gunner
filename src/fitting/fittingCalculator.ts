import type { TypeId } from "../gamedata/ids";
import {
  turretWeaponGroupForGroupId,
  type FittingDb,
  type FittingModuleStats,
  type HullBonus,
  type ShipStatFlatAttribute,
  type LauncherStats,
  type MissileGuidanceComputerStats,
  type MissileGuidanceEnhancerStats,
  type MissileScriptStats,
  type MissileStats,
  type OmnidirectionalTrackingEnhancerStats,
  type OmnidirectionalTrackingLinkStats,
  type PropulsionBonusAttribute,
  type SensorBoosterStats,
  type SensorDampenerStats,
  type SensorBoosterScriptStats,
  type SensorDampenerScriptStats,
  type SignalAmplifierStats,
  type SkillBonus,
  type StasisGrapplerStats,
  type StasisWebStats,
  type TargetPainterStats,
  type TrackingComputerStats,
  type TrackingDisruptorStats,
  type TurretBonusAttribute,
  type TurretScriptStats,
  type TurretStats,
  type TurretWeaponGroup,
  type WarpScramblerStats,
  type DisruptionScriptStats,
} from "../gamedata/fittingDb";
import type { FittedHull, HullTier, PropulsionId, PropulsionKind, PropulsionStats, ShipProfile, Ships, SkillLevel, StatConditions, TargetingSkills } from "../ships";
import type { DamageType } from "../sim";
import type { BoostLoadout, DisruptionScriptSpec, EwarLoadout, MissileBoosterLoadout, MissileBoosterSpec, MissileEnhancerSpec, MissileScriptSpec, SensorBoostLoadout, SensorBoosterSpec, SensorBoosterScriptSpec, SensorDampenerScriptSpec, SensorDampenerSpec, SensorSpec, SignalAmplifierSpec, StackingPenalty, StasisGrapplerSpec, StasisWebSpec, TargetPainterSpec, TrackingBoosterSpec, TrackingDisruptorSpec, TurretScriptSpec, WarpScramblerSpec, EnergyNeutralizerSpec, NosferatuSpec } from "../sim";
import { SIG_RESOLUTIONS, EMPTY_MISSILE_BOOSTER_LOADOUT, EMPTY_SENSOR_BOOST_LOADOUT, damageVectorFromPartial, damageVectorScale } from "../sim";
import type { ChargeCatalog, ImportedTurret, ImportedTurretBase, ImportedLauncher } from "./chargeCatalog";
import type { GunFamily, GunFamilies } from "./gunFamilies";
import type { MissileCatalog } from "./missileCatalog";
import type { MissileSkillModel, MissileSkillOutput } from "./missileStats";
import type { DroneCatalog, ImportedDrone } from "./droneCatalog";
import type { DroneSkillModel } from "./droneStats";
import type { FighterSkillModel } from "./fighterStats";
import type { ImportedFighter, ImportedFighterAttack } from "./fighterCatalog";
import { sigResolutionClassFromChargeSize, toTrackingRadPerSecond } from "./turretStats";
import type { FittingState, FittedModule } from "./fittingState";
import type { ItemNameCatalog } from "../gamedata/itemNames";
import { moduleSkillMultiplier, applyRigDrawbackReduction } from "./skillMultiplier";
import { EMPTY_DAMAGE_BREAKDOWN, type DamageBreakdown, type DamageFactor, chargeDamageByType, droneDamageByType, missileDamageByType } from "./damageBreakdown";

export interface PropulsionResult extends PropulsionStats {
  readonly propulsionId: PropulsionId;
  readonly propulsionModuleId: TypeId;
  readonly propulsionName: string;
}

export interface HullSideAggregation {
  readonly fitted: FittedHull;
  readonly propulsionId?: TypeId;
}

export interface FittingCalculator {
  resolveTurrets(fitting: FittingState, conditions: StatConditions): readonly ImportedTurret[];
  resolveLauncher(fitting: FittingState, conditions: StatConditions): ImportedLauncher | undefined;
  resolveHull(fitting: FittingState, conditions: StatConditions): HullSideAggregation;
  resolvePropulsion(fitting: FittingState): PropulsionResult | undefined;
  resolveEwar(fitting: FittingState, conditions: StatConditions): EwarLoadout;
  resolveEnergyWarfareResistance(fitting: FittingState): number;
  resolveBoosts(fitting: FittingState, conditions: StatConditions): BoostLoadout;
  resolveMissileBoosts(fitting: FittingState, conditions: StatConditions): MissileBoosterLoadout;
  resolveSensorBoosts(fitting: FittingState, conditions: StatConditions): SensorBoostLoadout;
  resolveSensorSpec(fitting: FittingState, conditions: StatConditions): SensorSpec;
  resolveDrones(fitting: FittingState, conditions: StatConditions): readonly ImportedDrone[];
  resolveFighters(fitting: FittingState, conditions: StatConditions): readonly ImportedFighter[];
  resolveCargoCharges(fitting: FittingState): readonly { id: TypeId; quantity: number }[];
}

interface FittingCalculatorDeps {
  readonly fittingDb: FittingDb;
  readonly ships: Ships;
  readonly chargeCatalog: ChargeCatalog;
  readonly gunFamilies: GunFamilies;
  readonly missileCatalog: MissileCatalog;
  readonly missileSkillModel: MissileSkillModel;
  readonly droneCatalog: DroneCatalog;
  readonly droneSkillModel: DroneSkillModel;
  readonly fighterSkillModel: FighterSkillModel;
  readonly stackingPenalty: StackingPenalty;
  readonly itemNameCatalog: ItemNameCatalog;
}

export class FittingCalculatorImpl implements FittingCalculator {
  private readonly db: FittingDb;
  private readonly ships: Ships;
  private readonly chargeCatalog: ChargeCatalog;
  private readonly gunFamilies: GunFamilies;
  private readonly missileCatalog: MissileCatalog;
  private readonly missileSkillModel: MissileSkillModel;
  private readonly droneCatalog: DroneCatalog;
  private readonly droneSkillModel: DroneSkillModel;
  private readonly fighterSkillModel: FighterSkillModel;
  private readonly stacking: StackingPenalty;
  private readonly itemNameCatalog: ItemNameCatalog;

  constructor(deps: FittingCalculatorDeps) {
    this.db = deps.fittingDb;
    this.ships = deps.ships;
    this.chargeCatalog = deps.chargeCatalog;
    this.gunFamilies = deps.gunFamilies;
    this.missileCatalog = deps.missileCatalog;
    this.missileSkillModel = deps.missileSkillModel;
    this.droneCatalog = deps.droneCatalog;
    this.droneSkillModel = deps.droneSkillModel;
    this.fighterSkillModel = deps.fighterSkillModel;
    this.stacking = deps.stackingPenalty;
    this.itemNameCatalog = deps.itemNameCatalog;
  }

  resolveTurrets(fitting: FittingState, conditions: StatConditions): readonly ImportedTurret[] {
    const sharedTrackingPercents: number[] = [];
    const sharedOptimalPercents: number[] = [];
    const sharedFalloffPercents: number[] = [];
    const damageModifiersByGroup = new Map<TurretWeaponGroup, TurretDamageModifier[]>();
    const speedMultipliersByGroup = new Map<TurretWeaponGroup, number[]>();

    for (const mod of fitting.supportModules) {
      const stats = this.db.modules[mod.moduleId];
      if (!stats) continue;
      const script = mod.chargeId ? this.db.scripts[mod.chargeId] : undefined;
      collectTurretPercents(stats, script, sharedTrackingPercents, sharedOptimalPercents, sharedFalloffPercents);
      collectDamageModuleModifiers(mod.moduleId, stats, damageModifiersByGroup, speedMultipliersByGroup);
    }

    if (fitting.turretGroups.length === 0) return [];

    const skillLevel = conditions.skillLevel;

    const result: ImportedTurret[] = [];
    for (const group of fitting.turretGroups) {
      const turret = this.db.turrets[group.moduleId];
      if (!turret) continue;
      const weaponGroup = turretWeaponGroupForGroupId(turret.groupID);
      const chargeId = group.chargeId;
      const skillRoFMultiplier = moduleSkillMultiplier(this.db.skillBonuses, turret.requiredSkillIds, "turretRoF", skillLevel, turret.groupID);

      const hullTrackingPercents: number[] = [];
      const hullOptimalPercents: number[] = [];
      const hullFalloffPercents: number[] = [];
      const hullDamageEntries: { percent: number; sourceId?: TypeId }[] = [];
      const hullRoFPercents: number[] = [];
      const hullSpoolMaxPercents: number[] = [];
      const hullCapPercents: number[] = [];

      for (const bonus of fitting.hullBonuses) {
        if (bonus.moduleSkillId && !turret.requiredSkillIds.includes(bonus.moduleSkillId)) continue;
        if (bonus.attribute === "capUse") {
          if (bonus.moduleGroupId !== undefined && bonus.moduleGroupId !== turret.groupID) continue;
          hullCapPercents.push(hullBonusPercent(bonus, skillLevel));
          continue;
        }
        if (!isTurretBonusAttribute(bonus.attribute)) continue;
        const percent = hullBonusPercent(bonus, skillLevel);
        switch (bonus.attribute) {
          case "turretTracking": hullTrackingPercents.push(percent); break;
          case "turretOptimal": hullOptimalPercents.push(percent); break;
          case "turretFalloff": hullFalloffPercents.push(percent); break;
          case "turretDamage": hullDamageEntries.push({ percent, sourceId: bonus.sourceId }); break;
          case "turretRoF": hullRoFPercents.push(percent); break;
          case "turretSpoolMax": hullSpoolMaxPercents.push(percent); break;
        }
      }

      const trackingBonus = this.stacking.apply([...sharedTrackingPercents, ...hullTrackingPercents].map((p) => 1 + p / 100));
      const optimalBonus = this.stacking.apply([...sharedOptimalPercents, ...hullOptimalPercents].map((p) => 1 + p / 100));
      const falloffBonus = this.stacking.apply([...sharedFalloffPercents, ...hullFalloffPercents].map((p) => 1 + p / 100));

      const moduleDamageModifiers = weaponGroup ? (damageModifiersByGroup.get(weaponGroup) ?? []) : [];
      const moduleSpeedMultipliers = weaponGroup ? (speedMultipliersByGroup.get(weaponGroup) ?? []) : [];
      const moduleDamageBonus = this.stacking.apply(moduleDamageModifiers.map((m) => m.multiplier));
      const moduleSpeedBonus = this.stacking.apply(moduleSpeedMultipliers);
      const hullDamageMultiplier = hullDamageEntries.filter((e) => e.sourceId === undefined).reduce((acc, e) => acc * (1 + e.percent / 100), 1);
      const subsystemDamageMultipliers = subsystemDamageMultipliersFromEntries(hullDamageEntries);
      const hullRoFMultiplier = hullRoFPercents.reduce((acc, p) => acc * (1 + p / 100), 1);
      const hullSpoolMaxMultiplier = hullSpoolMaxPercents.reduce((acc, p) => acc * (1 + p / 100), 1);
      const spool = turret.spoolPerCycle !== undefined && turret.spoolMax !== undefined
        ? { perCycle: turret.spoolPerCycle, max: turret.spoolMax * hullSpoolMaxMultiplier }
        : undefined;

      const skillEntries = computeSkillDamageEntries(this.db.skillBonuses, turret, skillLevel);
      const activeSkillEntries = skillEntries.filter((e) => e.multiplier !== 1);
      const skillDamageMultiplier = activeSkillEntries.reduce((acc, e) => acc * e.multiplier, 1);

      const modifiedDamageMultiplier = turret.damageMultiplier * moduleDamageBonus * hullDamageMultiplier * skillDamageMultiplier;
      const modifiedCycleTime = turret.cycleTime * moduleSpeedBonus * hullRoFMultiplier * skillRoFMultiplier;
      const skillCapUseMultiplier = moduleSkillMultiplier(this.db.skillBonuses, turret.requiredSkillIds, "capUse", skillLevel, turret.groupID);
      const hullCapMultiplier = hullCapPercents.reduce((acc, p) => acc * (1 + p / 100), 1);

      const [overloadDamage, overloadCycle] = weaponOverloadMultipliers(this.gunFamilies.familyOf(group.moduleId), conditions.weaponOverloaded);
      const finalDamageMultiplier = modifiedDamageMultiplier * overloadDamage;
      const finalCycleTime = modifiedCycleTime * overloadCycle;

      const factors = buildTurretDamageFactors(turret.damageMultiplier, moduleDamageBonus, moduleDamageModifiers, activeSkillEntries, skillDamageMultiplier, hullDamageMultiplier, fitting.profile.name, subsystemDamageMultipliers, overloadDamage);

      const sigResClass = sigResolutionClassFromChargeSize(turret.chargeSize);
      const sigRes = SIG_RESOLUTIONS[sigResClass];
      const skillTrackingMultiplier = moduleSkillMultiplier(this.db.skillBonuses, turret.requiredSkillIds, "turretTracking", skillLevel, turret.groupID);
      const skillOptimalMultiplier = moduleSkillMultiplier(this.db.skillBonuses, turret.requiredSkillIds, "turretOptimal", skillLevel, turret.groupID);
      const skillFalloffMultiplier = moduleSkillMultiplier(this.db.skillBonuses, turret.requiredSkillIds, "turretFalloff", skillLevel, turret.groupID);

      const trackingScore = turret.tracking * skillTrackingMultiplier * trackingBonus;
      const optimalScore = turret.optimal * skillOptimalMultiplier * optimalBonus;
      const falloffScore = turret.falloff * skillFalloffMultiplier * falloffBonus;

      const base: ImportedTurretBase = {
        tracking: toTrackingRadPerSecond(trackingScore, sigRes),
        optimal: optimalScore,
        falloff: falloffScore,
      };

      const chargeKey = { moduleId: group.moduleId, chargeSize: turret.chargeSize };
      const compatible = this.chargeCatalog.chargesForTurret(chargeKey);
      const selectedCharge = chargeId && compatible.some((option) => option.id === chargeId)
        ? chargeId
        : this.chargeCatalog.usualForTurret(chargeKey);
      const charge = this.db.charges[selectedCharge] ?? {};

      result.push({
        tracking: base.tracking * (charge.trackingMultiplier ?? 1),
        sigResolutionClass: sigResClass,
        optimal: base.optimal * (charge.rangeMultiplier ?? 1),
        falloff: base.falloff * (charge.falloffMultiplier ?? 1),
        chargeSize: turret.chargeSize,
        chargeId: selectedCharge,
        base,
        moduleId: group.moduleId,
        damageMultiplier: finalDamageMultiplier,
        damagePerShot: damageVectorScale(damageVectorFromPartial(chargeDamageByType(charge)), finalDamageMultiplier),
        cycleTime: finalCycleTime,
        capacitorNeed: turret.capacitorNeed * (charge.capacitorNeedMultiplier ?? 1) * skillCapUseMultiplier * hullCapMultiplier,
        turretCount: group.count,
        spool,
        damageBreakdown: { damageByType: chargeDamageByType(charge), factors },
      });
    }

    return result;
  }

  resolveLauncher(fitting: FittingState, conditions: StatConditions): ImportedLauncher | undefined {
    if (fitting.launcherGroups.length === 0) return undefined;

    let bestGroup: { moduleId: TypeId; count: number; chargeId?: TypeId; order: number } | undefined;
    let order = 0;
    for (const group of fitting.launcherGroups) {
      const candidate = { moduleId: group.moduleId, count: group.count, chargeId: group.chargeId, order: order++ };
      if (!bestGroup || candidate.count > bestGroup.count || (candidate.count === bestGroup.count && candidate.order < bestGroup.order)) {
        bestGroup = candidate;
      }
    }
    if (!bestGroup) return undefined;

    const launcherStats = this.db.launchers[bestGroup.moduleId];
    if (!launcherStats) return undefined;

    const chargeId = resolveMissileChargeId(this.db, this.missileCatalog, launcherStats, bestGroup.chargeId);
    if (!chargeId) return undefined;

    const missileStats = this.db.missiles[chargeId];
    if (!missileStats) return undefined;

    const bcsDamageModifiers: { moduleId: TypeId; multiplier: number }[] = [];
    const bcsCycleTimeMultipliers: number[] = [];
    for (const mod of fitting.supportModules) {
      const stats = this.db.modules[mod.moduleId];
      if (!stats) continue;
      if (stats.missileDamageMultiplier && stats.missileDamageMultiplier !== 1) bcsDamageModifiers.push({ moduleId: mod.moduleId, multiplier: stats.missileDamageMultiplier });
      if (stats.missileCycleTimeMultiplier && stats.missileCycleTimeMultiplier !== 1) bcsCycleTimeMultipliers.push(stats.missileCycleTimeMultiplier);
    }
    const bcsDamageBonus = this.stacking.apply(bcsDamageModifiers.map((m) => m.multiplier));
    const bcsCycleTimeBonus = this.stacking.apply(bcsCycleTimeMultipliers);

    const output = this.missileSkillModel.compute(launcherStats, missileStats, fitting.hullBonuses, conditions.skillLevel);
    const launcherOverloadCycle = conditions.weaponOverloaded ? WEAPON_OVERLOAD_ROF_MULTIPLIER : 1;
    const missileFactors = buildMissileDamageFactors(output, missileStats.damageType, fitting.profile.name, bcsDamageBonus, bcsDamageModifiers);
    return {
      moduleId: bestGroup.moduleId,
      name: launcherStats.name,
      count: bestGroup.count,
      chargeId,
      chargeName: missileStats.name,
      damagePerMissile: damageVectorScale(output.damagePerMissile, bcsDamageBonus),
      cycleTime: output.cycleTime * bcsCycleTimeBonus * launcherOverloadCycle,
      explosionRadius: output.explosionRadius,
      explosionVelocity: output.explosionVelocity,
      damageReductionFactor: output.damageReductionFactor,
      maxVelocity: output.maxVelocity,
      flightTime: output.flightTime,
      damageBreakdown: { damageByType: missileDamageByType(missileStats), factors: missileFactors },
    };
  }

  resolveHull(fitting: FittingState, conditions: StatConditions): HullSideAggregation {
    let flatMass = 0;
    const massPercentages: number[] = [];
    const speedPercents: number[] = [];
    const agilityMultipliers: number[] = [];
    const sigPercents: number[] = [];
    let sigRadiusAdd = 0;

    for (const mod of [...fitting.supportModules, ...fitting.ewarModules, ...fitting.defenseModules]) {
      const stats = this.db.modules[mod.moduleId];
      if (!stats) continue;
      if (stats.massAddition) flatMass += stats.massAddition;
      if (stats.massBonusPercentage) massPercentages.push(stats.massBonusPercentage / 100);
      if (stats.speedBonusPercent) speedPercents.push(stats.speedBonusPercent / 100);
      if (stats.agilityMultiplier) agilityMultipliers.push(stats.agilityMultiplier);
      if (stats.sigRadiusAdd) sigRadiusAdd += stats.sigRadiusAdd;
      if (stats.sigBonusPercent) sigPercents.push(stats.sigBonusPercent / 100);
      if (stats.rigDrawback) {
        const reducedPercent = applyRigDrawbackReduction(stats.rigDrawback, this.db.rigDrawbackReductions, conditions.skillLevel);
        switch (stats.rigDrawback.kind) {
          case "agility": agilityMultipliers.push(1 + reducedPercent / 100); break;
          case "signature": sigPercents.push(reducedPercent / 100); break;
          case "armorHp": break;
          case "shieldHp": break;
          case "cpu": break;
          case "cpuNeed": break;
          case "powerNeed": break;
          case "capacitorRecharge": break;
          case "cargoCapacity": break;
          case "warpSpeed": break;
          case "repairPowerGrid": break;
          default: { const _exhaustive: never = stats.rigDrawback.kind; void _exhaustive; }
        }
      }
    }

    let mwdSigBloomMultiplier = 1;
    for (const bonus of fitting.hullBonuses) {
      if (isPropulsionBonusAttribute(bonus.attribute)) {
        const percent = hullBonusPercent(bonus, conditions.skillLevel);
        switch (bonus.attribute) {
          case "maxVelocity": speedPercents.push(percent / 100); break;
          case "agility": agilityMultipliers.push(1 + percent / 100); break;
          case "mwdSigBloom": mwdSigBloomMultiplier *= 1 + percent / 100; break;
        }
        continue;
      }
      if (bonus.attribute === "sigRadiusFlat") sigRadiusAdd += bonus.magnitude;
    }

    const massMultiplier = this.stacking.apply(massPercentages.map((p) => 1 + p));
    const speedMultiplier = this.stacking.apply(speedPercents.map((p) => 1 + p));
    const inertiaMultiplier = this.stacking.apply(agilityMultipliers);
    const sigMultiplier = this.stacking.apply(sigPercents.map((p) => 1 + p));

    return {
      fitted: {
        mass: fitting.profile.mass + flatMass,
        massMultiplier,
        speedMultiplier,
        inertiaMultiplier,
        sigMultiplier,
        sigRadiusAdd,
        mwdSigBloomMultiplier,
      },
      propulsionId: fitting.propulsionModule?.moduleId,
    };
  }

  resolvePropulsion(fitting: FittingState): PropulsionResult | undefined {
    const id = fitting.propulsionModule?.moduleId;
    if (!id) return undefined;
    const stats = this.db.modules[id]?.propulsion;
    if (!stats) return undefined;
    const propulsionIdGeneric = findGenericPropulsionId(this.ships, fitting.profile, stats.kind, stats.sizeTier);
    if (!propulsionIdGeneric) return undefined;
    return { ...stats, propulsionId: propulsionIdGeneric, propulsionModuleId: id, propulsionName: this.db.modules[id].name };
  }

  resolveEwar(fitting: FittingState, conditions: StatConditions): EwarLoadout {
    const scripts = disruptionScriptSpecsFrom(this.db.disruptionScripts);
    const scriptByName = new Map(scripts.map((s) => [s.name, s]));
    const dampenerScripts = sensorDampenerScriptSpecsFrom(this.db.sensorDampenerScripts);
    const dampenerScriptByName = new Map(dampenerScripts.map((s) => [s.name, s]));
    const webs: StasisWebSpec[] = [];
    const grapplers: StasisGrapplerSpec[] = [];
    const disruptors: TrackingDisruptorSpec[] = [];
    const scramblers: WarpScramblerSpec[] = [];
    const painters: TargetPainterSpec[] = [];
    const dampeners: SensorDampenerSpec[] = [];
    const neutralizers: EnergyNeutralizerSpec[] = [];
    const nosferatu: NosferatuSpec[] = [];
    const skillLevel = conditions.skillLevel;

    for (const mod of fitting.ewarModules) {
      const webStats = this.db.stasisWebs[mod.moduleId];
      if (webStats) {
        webs.push({ moduleName: webStats.name, moduleId: webStats.id, maxRange: webStats.maxRange, speedFactor: Math.round(-webStats.speedFactorPercent * 10000) / 1000000, overloadRangeBonusPercent: webStats.overloadRangeBonusPercent, capacitorNeed: webStats.capacitorNeed * moduleSkillMultiplier(this.db.skillBonuses, webStats.requiredSkillIds, "capUse", skillLevel), cycleTime: webStats.cycleTime });
        continue;
      }
      const grapplerStats = this.db.stasisGrapplers[mod.moduleId];
      if (grapplerStats) {
        grapplers.push({ moduleName: grapplerStats.name, moduleId: grapplerStats.id, optimal: grapplerStats.optimal, falloff: grapplerStats.falloff, speedFactor: Math.round(-grapplerStats.speedFactorPercent * 10000) / 1000000, overloadOptimalBonusPercent: grapplerStats.overloadOptimalBonusPercent, capacitorNeed: grapplerStats.capacitorNeed * moduleSkillMultiplier(this.db.skillBonuses, grapplerStats.requiredSkillIds, "capUse", skillLevel), cycleTime: grapplerStats.cycleTime });
        continue;
      }
      const disruptorStats = this.db.trackingDisruptors[mod.moduleId];
      if (disruptorStats) {
        const scriptName = mod.chargeId ? this.itemNameCatalog.nameForId(mod.chargeId, "en") : undefined;
        const defaultScript = scriptName ? scriptByName.get(scriptName) : undefined;
        disruptors.push({ moduleName: disruptorStats.name, moduleId: disruptorStats.id, optimal: disruptorStats.optimal, falloff: disruptorStats.falloff, disruption: Math.round(-disruptorStats.disruptionPercent * 10000) / 1000000, defaultScript, overloadStrengthBonusPercent: disruptorStats.overloadStrengthBonusPercent, capacitorNeed: disruptorStats.capacitorNeed * moduleSkillMultiplier(this.db.skillBonuses, disruptorStats.requiredSkillIds, "capUse", skillLevel), cycleTime: disruptorStats.cycleTime });
        continue;
      }
      const scramblerStats = this.db.warpScramblers[mod.moduleId];
      if (scramblerStats) {
        scramblers.push({ moduleName: scramblerStats.name, moduleId: scramblerStats.id, maxRange: scramblerStats.maxRange, overloadRangeBonusPercent: scramblerStats.overloadRangeBonusPercent, capacitorNeed: scramblerStats.capacitorNeed * moduleSkillMultiplier(this.db.skillBonuses, scramblerStats.requiredSkillIds, "capUse", skillLevel), cycleTime: scramblerStats.cycleTime, propulsionBlock: scramblerStats.propulsionBlock });
        continue;
      }
      const painterStats = this.db.targetPainters[mod.moduleId];
      if (painterStats) {
        painters.push(painterSpecFrom(painterStats, painterStats.capacitorNeed * moduleSkillMultiplier(this.db.skillBonuses, painterStats.requiredSkillIds, "capUse", skillLevel)));
        continue;
      }
      const dampenerStats = this.db.sensorDampeners[mod.moduleId];
      if (dampenerStats) {
        const scriptName = mod.chargeId ? this.itemNameCatalog.nameForId(mod.chargeId, "en") : undefined;
        const defaultScript = scriptName ? dampenerScriptByName.get(scriptName) : undefined;
        dampeners.push(sensorDampenerSpecFrom(dampenerStats, defaultScript, dampenerStats.capacitorNeed * moduleSkillMultiplier(this.db.skillBonuses, dampenerStats.requiredSkillIds, "capUse", skillLevel)));
        continue;
      }
      const moduleStats = this.db.modules[mod.moduleId];
      if (moduleStats?.neutralizer) {
        const neutralizerStats = moduleStats.neutralizer;
        neutralizers.push({ moduleName: moduleStats.name, moduleId: mod.moduleId, amount: neutralizerStats.amount, cycleTime: neutralizerStats.cycleTime, capacitorNeed: neutralizerStats.capacitorNeed * moduleSkillMultiplier(this.db.skillBonuses, neutralizerStats.requiredSkillIds, "capUse", skillLevel), maxRange: neutralizerStats.maxRange, falloff: neutralizerStats.falloff });
        continue;
      }
      if (moduleStats?.nosferatu) {
        nosferatu.push({ moduleName: moduleStats.name, moduleId: mod.moduleId, amount: moduleStats.nosferatu.amount, cycleTime: moduleStats.nosferatu.cycleTime, maxRange: moduleStats.nosferatu.maxRange, falloff: moduleStats.nosferatu.falloff });
      }
    }

    const empty = webs.length === 0 && grapplers.length === 0 && disruptors.length === 0 && scramblers.length === 0 && painters.length === 0 && dampeners.length === 0 && neutralizers.length === 0 && nosferatu.length === 0;
    if (empty) return { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], neutralizers: [], nosferatu: [], scripts: [], dampenerScripts };
    return { webs, grapplers, disruptors, scramblers, painters, dampeners, neutralizers, nosferatu, scripts, dampenerScripts };
  }

  resolveEnergyWarfareResistance(fitting: FittingState): number {
    return (1 - this.stacking.apply(energyWarfareResistanceMultipliers(fitting.supportModules, this.db.modules))) * 100;
  }

  resolveBoosts(fitting: FittingState, conditions: StatConditions): BoostLoadout {
    const scripts = scriptSpecsFrom(this.db.scripts);
    const scriptByName = new Map(scripts.map((s) => [s.name, s]));
    const computers: TrackingBoosterSpec[] = [];

    for (const mod of fitting.boosterModules) {
      const computerStats = this.db.trackingComputers[mod.moduleId];
      if (!computerStats) continue;
      const scriptName = mod.chargeId ? this.itemNameCatalog.nameForId(mod.chargeId, "en") : undefined;
      const defaultScript = scriptName ? scriptByName.get(scriptName) : undefined;
      computers.push({ moduleName: computerStats.name, moduleId: computerStats.id, trackingBonusPercent: computerStats.trackingBonusPercent, optimalBonusPercent: computerStats.optimalBonusPercent, falloffBonusPercent: computerStats.falloffBonusPercent, defaultScript, capacitorNeed: computerStats.capacitorNeed * moduleSkillMultiplier(this.db.skillBonuses, computerStats.requiredSkillIds, "capUse", conditions.skillLevel), cycleTime: computerStats.cycleTime });
    }

    return { computers, scripts };
  }

  resolveMissileBoosts(fitting: FittingState, conditions: StatConditions): MissileBoosterLoadout {
    const scripts = missileScriptSpecsFrom(this.db.missileScripts);
    const scriptByName = new Map(scripts.map((s) => [s.name, s]));
    const computers: MissileBoosterSpec[] = [];
    const enhancers: MissileEnhancerSpec[] = [];

    for (const mod of fitting.missileBoosterModules) {
      const computerStats = this.db.missileGuidanceComputers[mod.moduleId];
      if (computerStats) {
        const scriptName = mod.chargeId ? this.itemNameCatalog.nameForId(mod.chargeId, "en") : undefined;
        const defaultScript = scriptName ? scriptByName.get(scriptName) : undefined;
        computers.push(missileBoosterSpecFrom(computerStats, defaultScript, computerStats.capacitorNeed * moduleSkillMultiplier(this.db.skillBonuses, computerStats.requiredSkillIds, "capUse", conditions.skillLevel)));
        continue;
      }
      const enhancerStats = this.db.missileGuidanceEnhancers[mod.moduleId];
      if (enhancerStats) {
        enhancers.push(missileEnhancerSpecFrom(enhancerStats));
      }
    }

    if (computers.length === 0 && enhancers.length === 0) return EMPTY_MISSILE_BOOSTER_LOADOUT;
    return { computers, enhancers, scripts };
  }

  resolveSensorBoosts(fitting: FittingState, conditions: StatConditions): SensorBoostLoadout {
    const boosterScripts = sensorBoosterScriptSpecsFrom(this.db.sensorBoosterScripts);
    const boosterScriptByName = new Map(boosterScripts.map((s) => [s.name, s]));
    const boosters: SensorBoosterSpec[] = [];
    const amplifiers: SignalAmplifierSpec[] = [];

    for (const mod of fitting.sensorBoosterModules) {
      const boosterStats = this.db.sensorBoosters[mod.moduleId];
      if (boosterStats) {
        const scriptName = mod.chargeId ? this.itemNameCatalog.nameForId(mod.chargeId, "en") : undefined;
        const defaultScript = scriptName ? boosterScriptByName.get(scriptName) : undefined;
        boosters.push(sensorBoosterSpecFrom(boosterStats, defaultScript, boosterStats.capacitorNeed * moduleSkillMultiplier(this.db.skillBonuses, boosterStats.requiredSkillIds, "capUse", conditions.skillLevel)));
      }
    }

    for (const mod of fitting.sensorAmplifierModules) {
      const amplifierStats = this.db.signalAmplifiers[mod.moduleId];
      if (amplifierStats) {
        amplifiers.push(signalAmplifierSpecFrom(amplifierStats));
      }
    }

    if (boosters.length === 0 && amplifiers.length === 0) return EMPTY_SENSOR_BOOST_LOADOUT;
    return { boosters, amplifiers, boosterScripts };
  }

  resolveSensorSpec(fitting: FittingState, conditions: StatConditions): SensorSpec {
    return resolveSensorStats(fitting.profile, fitting.hullBonuses, conditions.targetingSkills);
  }

  resolveDrones(fitting: FittingState, conditions: StatConditions): readonly ImportedDrone[] {
    if (fitting.droneGroups.length === 0) return [];

    const ddaModifiers: { moduleId: TypeId; bonus: number }[] = [];
    const odtlTrackingPercents: number[] = [];
    const odtlOptimalPercents: number[] = [];
    const odtlFalloffPercents: number[] = [];
    const oteTrackingPercents: number[] = [];
    const oteOptimalPercents: number[] = [];
    const oteFalloffPercents: number[] = [];

    for (const mod of fitting.droneBoosterModules) {
      const moduleStats = this.db.modules[mod.moduleId];
      if (moduleStats?.droneDamageBonus) ddaModifiers.push({ moduleId: mod.moduleId, bonus: moduleStats.droneDamageBonus });
      const odtlStats = this.db.omnidirectionalTrackingLinks[mod.moduleId];
      if (odtlStats) {
        odtlTrackingPercents.push(odtlStats.trackingBonusPercent);
        odtlOptimalPercents.push(odtlStats.optimalBonusPercent);
        odtlFalloffPercents.push(odtlStats.falloffBonusPercent);
        continue;
      }
      const oteStats = this.db.omnidirectionalTrackingEnhancers[mod.moduleId];
      if (oteStats) {
        oteTrackingPercents.push(oteStats.trackingBonusPercent);
        oteOptimalPercents.push(oteStats.optimalBonusPercent);
        oteFalloffPercents.push(oteStats.falloffBonusPercent);
      }
    }

    const ddaDamageBonus = ddaModifiers.length > 0 ? this.stacking.apply(ddaModifiers.map((m) => 1 + m.bonus / 100)) : 1;
    const trackingBonus = this.stacking.apply([...odtlTrackingPercents, ...oteTrackingPercents].map((p) => 1 + p / 100));
    const optimalBonus = this.stacking.apply([...odtlOptimalPercents, ...oteOptimalPercents].map((p) => 1 + p / 100));
    const falloffBonus = this.stacking.apply([...odtlFalloffPercents, ...oteFalloffPercents].map((p) => 1 + p / 100));
    const controlRange = computeDroneControlRange(fitting.droneBoosterModules, this.db.modules, conditions.skillLevel);

    const result: ImportedDrone[] = [];
    for (const group of fitting.droneGroups) {
      const stats = this.db.combatDrones[group.typeId];
      if (!stats) continue;
      const skillOutput = this.droneSkillModel.compute(stats, fitting.hullBonuses, conditions.skillLevel);
      const finalDamageMultiplier = skillOutput.damageMultiplier * ddaDamageBonus;
      const finalTracking = skillOutput.tracking * trackingBonus;
      const finalOptimal = skillOutput.optimal * optimalBonus;
      const finalFalloff = skillOutput.falloff * falloffBonus;

      const factors = buildDroneDamageFactors(stats.damageMultiplier, ddaDamageBonus, ddaModifiers, skillOutput.skillDamageMultiplier, skillOutput.skillDamageIds, skillOutput.hullDamageMultiplier, fitting.profile.name, skillOutput.subsystemDamageMultipliers ?? []);

      result.push({
        typeId: group.typeId,
        name: stats.name,
        sizeClass: stats.sizeClass,
        count: group.count,
        damageMultiplier: finalDamageMultiplier,
        emDamage: stats.emDamage,
        thermalDamage: stats.thermalDamage,
        kineticDamage: stats.kineticDamage,
        explosiveDamage: stats.explosiveDamage,
        tracking: finalTracking,
        sigResolution: stats.sigResolution,
        optimal: finalOptimal,
        falloff: finalFalloff,
        maxVelocity: skillOutput.maxVelocity,
        orbitSpeed: skillOutput.orbitSpeed,
        orbitRange: stats.orbitRange,
        cycleTime: stats.cycleTime,
        bandwidth: stats.bandwidth,
        volume: stats.volume,
        controlRange,
        damageBreakdown: { damageByType: droneDamageByType(stats), factors },
      });
    }
    return result;
  }

  resolveFighters(fitting: FittingState, conditions: StatConditions): readonly ImportedFighter[] {
    if (fitting.fighterGroups.length === 0) return [];

    const otlOptimalPercents: number[] = [];
    const otlFalloffPercents: number[] = [];
    const aoeVelocityPercents: number[] = [];
    const aoeCloudSizePercents: number[] = [];
    for (const mod of fitting.droneBoosterModules) {
      const otlStats = this.db.omnidirectionalTrackingLinks[mod.moduleId];
      if (otlStats) {
        otlOptimalPercents.push(otlStats.optimalBonusPercent);
        otlFalloffPercents.push(otlStats.falloffBonusPercent);
        aoeVelocityPercents.push(otlStats.aoeVelocityBonusPercent);
        aoeCloudSizePercents.push(otlStats.aoeCloudSizeBonusPercent);
        continue;
      }
      const oteStats = this.db.omnidirectionalTrackingEnhancers[mod.moduleId];
      if (oteStats) {
        otlOptimalPercents.push(oteStats.optimalBonusPercent);
        otlFalloffPercents.push(oteStats.falloffBonusPercent);
        aoeVelocityPercents.push(oteStats.aoeVelocityBonusPercent);
        aoeCloudSizePercents.push(oteStats.aoeCloudSizeBonusPercent);
      }
    }

    const optimalBonus = this.stacking.apply(otlOptimalPercents.map((p) => 1 + p / 100));
    const falloffBonus = this.stacking.apply(otlFalloffPercents.map((p) => 1 + p / 100));
    const aoeVelocityMultiplier = this.stacking.apply(aoeVelocityPercents.map((p) => 1 + p / 100));
    const aoeCloudSizeMultiplier = this.stacking.apply(aoeCloudSizePercents.map((p) => 1 + p / 100));

    const result: ImportedFighter[] = [];
    for (const group of fitting.fighterGroups) {
      const stats = this.db.fighters[group.typeId];
      if (!stats) continue;
      const skillOutput = this.fighterSkillModel.compute(stats, fitting.hullBonuses, conditions.skillLevel);
      const attack: ImportedFighterAttack | undefined = stats.attack
        ? {
            damageMultiplier: skillOutput.damageMultiplier,
            emDamage: stats.attack.emDamage,
            thermalDamage: stats.attack.thermalDamage,
            kineticDamage: stats.attack.kineticDamage,
            explosiveDamage: stats.attack.explosiveDamage,
            cycleTime: stats.attack.cycleTime,
            explosionRadius: stats.attack.explosionRadius * aoeCloudSizeMultiplier,
            explosionVelocity: stats.attack.explosionVelocity * aoeVelocityMultiplier,
            optimal: stats.attack.optimal * skillOutput.optimalMultiplier * optimalBonus,
            falloff: stats.attack.falloff * falloffBonus,
            damageReductionFactor: stats.attack.damageReductionFactor,
            damageReductionSensitivity: stats.attack.damageReductionSensitivity,
            numShots: stats.attack.numShots,
            rearmTime: stats.attack.rearmTime,
          }
        : undefined;
      const factors = buildFighterDamageFactors(skillOutput.skillDamageMultiplier, skillOutput.skillDamageIds, skillOutput.hullDamageMultiplier, fitting.profile.name);
      result.push({
        typeId: group.typeId,
        name: stats.name,
        kind: stats.kind,
        count: group.count,
        squadronMaxSize: stats.squadronMaxSize,
        maxVelocity: skillOutput.maxVelocity,
        orbitRange: stats.orbitRange,
        signatureRadius: stats.signatureRadius,
        refuelingTime: stats.refuelingTime,
        volume: stats.volume,
        ...(attack ? { attack } : {}),
        damageBreakdown: attack ? { damageByType: fighterDamageByType(stats.attack), factors } : EMPTY_DAMAGE_BREAKDOWN,
      });
    }
    return result;
  }

  resolveCargoCharges(fitting: FittingState): readonly { id: TypeId; quantity: number }[] {
    const charges: { id: TypeId; quantity: number }[] = [];
    for (const item of fitting.cargo) {
      if (this.db.charges[item.id] || this.db.missiles[item.id]) charges.push({ id: item.id, quantity: item.quantity });
    }
    return charges;
  }
}

function resolveMissileChargeId(db: FittingDb, missileCatalog: MissileCatalog, launcher: LauncherStats, loadedChargeId: TypeId | undefined): TypeId | undefined {
  if (loadedChargeId && db.missiles[loadedChargeId] && launcher.chargeGroups.includes(db.missiles[loadedChargeId].chargeGroup)) return loadedChargeId;
  return missileCatalog.usualForLauncher(launcher);
}

function findGenericPropulsionId(ships: Ships, profile: ShipProfile, kind: PropulsionKind, sizeTier: HullTier): PropulsionId | undefined {
  const option = ships.fittingOptions(profile).find((module) => module.kind === kind && module.sizeTier === sizeTier);
  return option?.id;
}

function scriptSpecsFrom(scripts: Readonly<Record<string, TurretScriptStats>>): TurretScriptSpec[] {
  const result: TurretScriptSpec[] = [];
  for (const stats of Object.values(scripts)) {
    result.push({ name: stats.name, moduleId: stats.id, trackingMultiplier: stats.trackingMultiplier, optimalMultiplier: stats.optimalMultiplier, falloffMultiplier: stats.falloffMultiplier });
  }
  return result;
}

function disruptionScriptSpecsFrom(scripts: Readonly<Record<string, DisruptionScriptStats>>): DisruptionScriptSpec[] {
  const result: DisruptionScriptSpec[] = [];
  for (const stats of Object.values(scripts)) {
    result.push({ name: stats.name, moduleId: stats.id, trackingMultiplier: 1 + stats.trackingDeltaBonus / 100, optimalMultiplier: 1 + stats.rangeDeltaBonus / 100, falloffMultiplier: 1 + stats.falloffDeltaBonus / 100 });
  }
  return result;
}

function painterSpecFrom(stats: TargetPainterStats, capacitorNeed: number): TargetPainterSpec {
  return { moduleName: stats.name, moduleId: stats.id, maxRange: stats.maxRange, falloff: stats.falloff, signatureRadiusBonusPercent: stats.signatureRadiusBonusPercent, overloadStrengthBonusPercent: stats.overloadStrengthBonusPercent, capacitorNeed, cycleTime: stats.cycleTime };
}

function sensorDampenerSpecFrom(stats: SensorDampenerStats, defaultScript: SensorDampenerScriptSpec | undefined, capacitorNeed: number): SensorDampenerSpec {
  return { moduleName: stats.name, moduleId: stats.id, optimal: stats.optimal, falloff: stats.falloff, scanResolutionBonusPercent: stats.scanResolutionBonusPercent, maxTargetRangeBonusPercent: stats.maxTargetRangeBonusPercent, overloadStrengthBonusPercent: stats.overloadStrengthBonusPercent, defaultScript, capacitorNeed, cycleTime: stats.cycleTime };
}

function sensorDampenerScriptSpecsFrom(scripts: Readonly<Record<string, SensorDampenerScriptStats>>): SensorDampenerScriptSpec[] {
  const result: SensorDampenerScriptSpec[] = [];
  for (const stats of Object.values(scripts)) {
    result.push({ name: stats.name, moduleId: stats.id, scanResolutionMultiplier: stats.scanResolutionMultiplier, maxTargetRangeMultiplier: stats.maxTargetRangeMultiplier });
  }
  return result;
}

function sensorBoosterScriptSpecsFrom(scripts: Readonly<Record<string, SensorBoosterScriptStats>>): SensorBoosterScriptSpec[] {
  const result: SensorBoosterScriptSpec[] = [];
  for (const stats of Object.values(scripts)) {
    result.push({ name: stats.name, moduleId: stats.id, scanResolutionMultiplier: stats.scanResolutionMultiplier, maxTargetRangeMultiplier: stats.maxTargetRangeMultiplier });
  }
  return result;
}

function sensorBoosterSpecFrom(stats: SensorBoosterStats, defaultScript: SensorBoosterScriptSpec | undefined, capacitorNeed: number): SensorBoosterSpec {
  return { moduleName: stats.name, moduleId: stats.id, scanResolutionBonusPercent: stats.scanResolutionBonusPercent, maxTargetRangeBonusPercent: stats.maxTargetRangeBonusPercent, overloadStrengthBonusPercent: stats.overloadStrengthBonusPercent, defaultScript, capacitorNeed, cycleTime: stats.cycleTime };
}

function signalAmplifierSpecFrom(stats: SignalAmplifierStats): SignalAmplifierSpec {
  return { moduleName: stats.name, moduleId: stats.id, scanResolutionBonusPercent: stats.scanResolutionBonusPercent, maxTargetRangeBonusPercent: stats.maxTargetRangeBonusPercent, maxLockedTargetsBonus: stats.maxLockedTargetsBonus };
}

function missileScriptSpecsFrom(scripts: Readonly<Record<string, MissileScriptStats>>): MissileScriptSpec[] {
  const result: MissileScriptSpec[] = [];
  for (const stats of Object.values(scripts)) {
    result.push({ name: stats.name, moduleId: stats.id, explosionRadiusMultiplier: stats.explosionRadiusMultiplier, explosionVelocityMultiplier: stats.explosionVelocityMultiplier, missileVelocityMultiplier: stats.missileVelocityMultiplier, flightTimeMultiplier: stats.flightTimeMultiplier });
  }
  return result;
}

function missileBoosterSpecFrom(stats: MissileGuidanceComputerStats, defaultScript: MissileScriptSpec | undefined, capacitorNeed: number): MissileBoosterSpec {
  return { moduleName: stats.name, moduleId: stats.id, explosionRadiusBonusPercent: stats.explosionRadiusBonusPercent, explosionVelocityBonusPercent: stats.explosionVelocityBonusPercent, missileVelocityBonusPercent: stats.missileVelocityBonusPercent, flightTimeBonusPercent: stats.flightTimeBonusPercent, overloadStrengthBonusPercent: stats.overloadStrengthBonusPercent, defaultScript, capacitorNeed, cycleTime: stats.cycleTime };
}

function missileEnhancerSpecFrom(stats: MissileGuidanceEnhancerStats): MissileEnhancerSpec {
  return { moduleName: stats.name, moduleId: stats.id, explosionRadiusBonusPercent: stats.explosionRadiusBonusPercent, explosionVelocityBonusPercent: stats.explosionVelocityBonusPercent, missileVelocityBonusPercent: stats.missileVelocityBonusPercent, flightTimeBonusPercent: stats.flightTimeBonusPercent };
}

function collectTurretPercents(stats: FittingModuleStats, script: TurretScriptStats | undefined, trackingPercents: number[], optimalPercents: number[], falloffPercents: number[]): void {
  if (stats.turretTrackingPercent) {
    const percent = stats.turretTrackingPercent * (script?.trackingMultiplier ?? 1);
    if (percent !== 0) trackingPercents.push(percent);
  }
  if (stats.turretOptimalPercent) {
    const percent = stats.turretOptimalPercent * (script?.optimalMultiplier ?? 1);
    if (percent !== 0) optimalPercents.push(percent);
  }
  if (stats.turretFalloffPercent) {
    const percent = stats.turretFalloffPercent * (script?.falloffMultiplier ?? 1);
    if (percent !== 0) falloffPercents.push(percent);
  }
}

function collectDamageModuleModifiers(moduleId: TypeId, stats: FittingModuleStats, damageModifiersByGroup: Map<TurretWeaponGroup, TurretDamageModifier[]>, speedMultipliersByGroup: Map<TurretWeaponGroup, number[]>): void {
  if (!stats.turretWeaponGroup) return;
  const group = stats.turretWeaponGroup;
  if (stats.turretDamageMultiplier && stats.turretDamageMultiplier !== 1) {
    const list = damageModifiersByGroup.get(group) ?? [];
    list.push({ moduleId, multiplier: stats.turretDamageMultiplier });
    damageModifiersByGroup.set(group, list);
  }
  if (stats.turretSpeedMultiplier && stats.turretSpeedMultiplier !== 1) {
    const list = speedMultipliersByGroup.get(group) ?? [];
    list.push(stats.turretSpeedMultiplier);
    speedMultipliersByGroup.set(group, list);
  }
}

interface SkillDamageEntry {
  readonly skillId: TypeId;
  readonly multiplier: number;
}

function computeSkillDamageEntries(skillBonuses: readonly SkillBonus[], turret: TurretStats, skillLevel: number): readonly SkillDamageEntry[] {
  const entries: SkillDamageEntry[] = [];
  for (const bonus of skillBonuses) {
    if (bonus.bonusType !== "turretDamage") continue;
    if (bonus.appliesTo !== "module") continue;
    if (bonus.requiredSkillId !== undefined && !turret.requiredSkillIds.includes(bonus.requiredSkillId)) continue;
    if (bonus.moduleGroupId !== undefined && bonus.moduleGroupId !== turret.groupID) continue;
    entries.push({ skillId: bonus.skillId, multiplier: 1 + (bonus.magnitudePerLevel * skillLevel) / 100 });
  }
  return entries;
}

function hullBonusPercent(bonus: HullBonus, skillLevel: number): number {
  return bonus.magnitude * (bonus.scalesWithHullSkill ? skillLevel : 1);
}

function flatSum(hullBonuses: readonly HullBonus[], attribute: ShipStatFlatAttribute): number {
  return hullBonuses.reduce((sum, bonus) => (bonus.attribute === attribute ? sum + bonus.magnitude : sum), 0);
}

function resolveSensorStats(profile: ShipProfile, hullBonuses: readonly HullBonus[], targeting: TargetingSkills | undefined): SensorSpec {
  const longRangeLevel = targeting?.longRangeTargeting ?? 0;
  const signatureAnalysisLevel = targeting?.signatureAnalysis ?? 0;
  const targetManagementLevel = targeting?.targetManagement ?? 0;
  const advancedTargetManagementLevel = targeting?.advancedTargetManagement ?? 0;

  const signatureAnalysisMultiplier = 1 + 0.05 * signatureAnalysisLevel;
  const longRangeMultiplier = 1 + 0.05 * longRangeLevel;

  const scanResolution = Math.round(profile.scanResolution * signatureAnalysisMultiplier);
  const maxTargetingRange = Math.round((profile.maxTargetingRange + flatSum(hullBonuses, "maxTargetingRangeFlat")) * longRangeMultiplier);
  const maxLockedTargets = profile.maxLockedTargets + targetManagementLevel + advancedTargetManagementLevel;

  return { scanResolution, maxTargetingRange, maxLockedTargets };
}

const PROPULSION_BONUS_ATTRIBUTES: Record<PropulsionBonusAttribute, true> = { maxVelocity: true, agility: true, mwdSigBloom: true };
const TURRET_BONUS_ATTRIBUTES: Record<TurretBonusAttribute, true> = { turretTracking: true, turretOptimal: true, turretFalloff: true, turretDamage: true, turretRoF: true, turretSpoolMax: true };

function isPropulsionBonusAttribute(attr: HullBonus["attribute"]): attr is PropulsionBonusAttribute {
  return attr in PROPULSION_BONUS_ATTRIBUTES;
}

function isTurretBonusAttribute(attr: HullBonus["attribute"]): attr is TurretBonusAttribute {
  return attr in TURRET_BONUS_ATTRIBUTES;
}

const WEAPON_OVERLOAD_DAMAGE_MULTIPLIER = 1.15;
const WEAPON_OVERLOAD_ROF_MULTIPLIER = 0.85;
const SHORT_RANGE_GUN_FAMILIES: ReadonlySet<GunFamily> = new Set(["pulseLaser", "blaster", "autocannon", "disintegrator"]);

function weaponOverloadMultipliers(family: GunFamily, weaponOverloaded: boolean): readonly [damageMultiplier: number, cycleMultiplier: number] {
  if (!weaponOverloaded) return [1, 1] as const;
  if (SHORT_RANGE_GUN_FAMILIES.has(family)) return [WEAPON_OVERLOAD_DAMAGE_MULTIPLIER, 1] as const;
  return [1, WEAPON_OVERLOAD_ROF_MULTIPLIER] as const;
}

interface TurretDamageModifier {
  readonly moduleId: TypeId;
  readonly multiplier: number;
}

function buildTurretDamageFactors(baseMultiplier: number, moduleDamageBonus: number, moduleModifiers: readonly TurretDamageModifier[], activeSkillEntries: readonly SkillDamageEntry[], skillDamageMultiplier: number, hullDamageMultiplier: number, hullName: string, subsystemDamageMultipliers: readonly SubsystemDamageMultiplier[], overloadDamage: number): readonly DamageFactor[] {
  const factors: DamageFactor[] = [{ kind: "base", multiplier: baseMultiplier }];
  if (moduleDamageBonus !== 1) factors.push({ kind: "module", multiplier: moduleDamageBonus, moduleIds: moduleModifiers.map((m) => m.moduleId) });
  if (activeSkillEntries.length > 0) {
    const skillIds = deduplicateSkillIds(activeSkillEntries.map((e) => e.skillId));
    factors.push({ kind: "skill", multiplier: skillDamageMultiplier, skillIds });
  }
  if (hullDamageMultiplier !== 1) factors.push({ kind: "hull", multiplier: hullDamageMultiplier, hullName });
  for (const subsystem of subsystemDamageMultipliers) factors.push({ kind: "subsystem", multiplier: subsystem.multiplier, moduleIds: [subsystem.sourceId] });
  if (overloadDamage !== 1) factors.push({ kind: "overload", multiplier: overloadDamage });
  return factors;
}

function deduplicateSkillIds(ids: readonly TypeId[]): readonly TypeId[] {
  const seen = new Set<string>();
  const result: TypeId[] = [];
  for (const id of ids) {
    const key = String(id);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(id);
    }
  }
  return result;
}

interface SubsystemDamageMultiplier {
  readonly sourceId: TypeId;
  readonly multiplier: number;
}

function subsystemDamageMultipliersFromEntries(entries: readonly { readonly percent: number; readonly sourceId?: TypeId }[]): readonly SubsystemDamageMultiplier[] {
  const bySource = new Map<TypeId, number>();
  for (const entry of entries) {
    if (entry.sourceId === undefined) continue;
    bySource.set(entry.sourceId, (bySource.get(entry.sourceId) ?? 1) * (1 + entry.percent / 100));
  }
  return [...bySource.entries()].map(([sourceId, multiplier]) => ({ sourceId, multiplier }));
}

function buildMissileDamageFactors(output: MissileSkillOutput, missileDamageType: DamageType, hullName: string, moduleDamageBonus: number, moduleModifiers: readonly { moduleId: TypeId; multiplier: number }[]): readonly DamageFactor[] {
  const factors: DamageFactor[] = [{ kind: "base", multiplier: 1 }];
  if (moduleDamageBonus !== 1) factors.push({ kind: "module", multiplier: moduleDamageBonus, moduleIds: moduleModifiers.map((m) => m.moduleId) });
  if (output.skillDamageMultiplier !== 1 && output.skillDamageIds.length > 0) factors.push({ kind: "skill", multiplier: output.skillDamageMultiplier, skillIds: output.skillDamageIds });
  if (output.hullDamageMultiplier !== 1) factors.push({ kind: "hull", multiplier: output.hullDamageMultiplier, hullName });
  if (output.hullTypedDamageMultiplier !== undefined && output.hullTypedDamageMultiplier !== 1) factors.push({ kind: "hull", multiplier: output.hullTypedDamageMultiplier, hullName, damageType: missileDamageType });
  for (const subsystem of output.subsystemDamageMultipliers ?? []) {
    factors.push({ kind: "subsystem", multiplier: subsystem.multiplier, moduleIds: [subsystem.sourceId], ...(subsystem.typed ? { damageType: missileDamageType } : {}) });
  }
  return factors;
}

function buildDroneDamageFactors(baseMultiplier: number, moduleDamageBonus: number, moduleModifiers: readonly { moduleId: TypeId; bonus: number }[], skillDamageMultiplier: number, skillDamageIds: readonly TypeId[], hullDamageMultiplier: number, hullName: string, subsystemDamageMultipliers: readonly SubsystemDamageMultiplier[]): readonly DamageFactor[] {
  const factors: DamageFactor[] = [{ kind: "base", multiplier: baseMultiplier }];
  if (moduleDamageBonus !== 1) factors.push({ kind: "module", multiplier: moduleDamageBonus, moduleIds: moduleModifiers.map((m) => m.moduleId) });
  if (skillDamageMultiplier !== 1) factors.push({ kind: "skill", multiplier: skillDamageMultiplier, skillIds: skillDamageIds });
  if (hullDamageMultiplier !== 1) factors.push({ kind: "hull", multiplier: hullDamageMultiplier, hullName });
  for (const subsystem of subsystemDamageMultipliers) factors.push({ kind: "subsystem", multiplier: subsystem.multiplier, moduleIds: [subsystem.sourceId] });
  return factors;
}

function buildFighterDamageFactors(skillDamageMultiplier: number, skillDamageIds: readonly TypeId[], hullDamageMultiplier: number, hullName: string): readonly DamageFactor[] {
  const factors: DamageFactor[] = [{ kind: "base", multiplier: 1 }];
  if (skillDamageMultiplier !== 1) factors.push({ kind: "skill", multiplier: skillDamageMultiplier, skillIds: skillDamageIds });
  if (hullDamageMultiplier !== 1) factors.push({ kind: "hull", multiplier: hullDamageMultiplier, hullName });
  return factors;
}

function fighterDamageByType(attack: { readonly emDamage: number; readonly thermalDamage: number; readonly kineticDamage: number; readonly explosiveDamage: number } | undefined): Readonly<Partial<Record<DamageType, number>>> {
  const result: Partial<Record<DamageType, number>> = {};
  if (attack?.emDamage) result.em = attack.emDamage;
  if (attack?.thermalDamage) result.thermal = attack.thermalDamage;
  if (attack?.kineticDamage) result.kinetic = attack.kineticDamage;
  if (attack?.explosiveDamage) result.explosive = attack.explosiveDamage;
  return result;
}

interface SubsystemDamageMultiplier {
  readonly sourceId: TypeId;
  readonly multiplier: number;
}

// EVE: base droneControlDistance 20000 plus Drone Avionics 5000/level and Advanced Drone Avionics 3000/level; the uniform skill level trains both, hence 8000 per level.
const DRONE_CONTROL_RANGE_BASE = 20000;
const DRONE_CONTROL_RANGE_PER_SKILL_LEVEL = 8000;

function computeDroneControlRange(droneBoosterModules: readonly FittedModule[], modules: Readonly<Record<string, FittingModuleStats>>, skillLevel: SkillLevel): number {
  let bonus = DRONE_CONTROL_RANGE_BASE + skillLevel * DRONE_CONTROL_RANGE_PER_SKILL_LEVEL;
  for (const mod of droneBoosterModules) {
    const stats = modules[mod.moduleId];
    if (stats?.droneControlRangeBonus) bonus += stats.droneControlRangeBonus;
  }
  return bonus;
}

export { computeDroneControlRange as _computeDroneControlRange };

function energyWarfareResistanceMultipliers(supportModules: readonly FittedModule[], modules: Readonly<Record<string, FittingModuleStats>>): readonly number[] {
  const multipliers: number[] = [];
  for (const mod of supportModules) {
    const bonus = modules[mod.moduleId]?.capacitor?.energyWarfareResistanceBonus;
    if (bonus === undefined) continue;
    multipliers.push(1 + bonus / 100);
  }
  return multipliers;
}

export { resolveSensorStats as _resolveSensorStats };
