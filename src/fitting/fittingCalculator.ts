import type { TypeId } from "../gamedata/ids";
import type { FittingDb, FittingModuleStats, HullBonus, LauncherStats, MissileStats, SkillBonus, StasisGrapplerStats, StasisWebStats, TrackingComputerStats, TrackingDisruptorStats, TurretScriptStats, TurretStats, TurretWeaponGroup, WarpScramblerStats, DisruptionScriptStats } from "../gamedata/fittingDb";
import type { FittedHull, HullTier, PropulsionId, PropulsionKind, PropulsionStats, ShipProfile, Ships, SkillLevel, StatConditions } from "../ships";
import type { BoostLoadout, DisruptionScriptSpec, EwarLoadout, StackingPenalty, StasisGrapplerSpec, StasisWebSpec, TrackingBoosterSpec, TrackingDisruptorSpec, TurretScriptSpec, WarpScramblerSpec } from "../sim";
import { SIG_RESOLUTIONS } from "../sim";
import type { ChargeCatalog, ImportedTurret, ImportedTurretBase, ImportedLauncher } from "./chargeCatalog";
import type { GunFamily, GunFamilies } from "./gunFamilies";
import type { MissileCatalog } from "./missileCatalog";
import type { MissileSkillModel } from "./missileStats";
import { TRACKING_SKILL_BONUS, OPTIMAL_SKILL_BONUS, FALLOFF_SKILL_BONUS, STANDARD_SIGNATURE_RESOLUTION, sigResolutionClassFromChargeSize } from "./turretStats";
import type { FittingState } from "./fittingState";
import type { ItemNameCatalog } from "../gamedata/itemNames";

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
  resolveEwar(fitting: FittingState): EwarLoadout;
  resolveBoosts(fitting: FittingState): BoostLoadout;
  resolveCargoCharges(fitting: FittingState): readonly { id: TypeId; quantity: number }[];
}

interface FittingCalculatorDeps {
  readonly fittingDb: FittingDb;
  readonly ships: Ships;
  readonly chargeCatalog: ChargeCatalog;
  readonly gunFamilies: GunFamilies;
  readonly missileCatalog: MissileCatalog;
  readonly missileSkillModel: MissileSkillModel;
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
  private readonly stacking: StackingPenalty;
  private readonly itemNameCatalog: ItemNameCatalog;

  constructor(deps: FittingCalculatorDeps) {
    this.db = deps.fittingDb;
    this.ships = deps.ships;
    this.chargeCatalog = deps.chargeCatalog;
    this.gunFamilies = deps.gunFamilies;
    this.missileCatalog = deps.missileCatalog;
    this.missileSkillModel = deps.missileSkillModel;
    this.stacking = deps.stackingPenalty;
    this.itemNameCatalog = deps.itemNameCatalog;
  }

  resolveTurrets(fitting: FittingState, conditions: StatConditions): readonly ImportedTurret[] {
    const sharedTrackingPercents: number[] = [];
    const sharedOptimalPercents: number[] = [];
    const sharedFalloffPercents: number[] = [];
    const damageMultipliersByGroup = new Map<TurretWeaponGroup, number[]>();
    const speedMultipliersByGroup = new Map<TurretWeaponGroup, number[]>();

    for (const mod of fitting.supportModules) {
      const stats = this.db.modules[mod.moduleId];
      if (!stats) continue;
      const script = mod.chargeId ? this.db.scripts[mod.chargeId] : undefined;
      collectTurretPercents(stats, script, sharedTrackingPercents, sharedOptimalPercents, sharedFalloffPercents);
      collectDamageModuleModifiers(stats, damageMultipliersByGroup, speedMultipliersByGroup);
    }

    if (fitting.turretGroups.length === 0) return [];

    const skillLevel = conditions.skillLevel;
    const skillRoFMultiplier = computeSkillRoFMultiplier(this.db.skillBonuses, skillLevel);

    const result: ImportedTurret[] = [];
    for (const group of fitting.turretGroups) {
      const turret = this.db.turrets[group.moduleId];
      if (!turret) continue;
      const weaponGroup = turretWeaponGroupFromSkill(turret.turretSkill);
      const chargeId = group.chargeId;

      const hullTrackingPercents: number[] = [];
      const hullOptimalPercents: number[] = [];
      const hullFalloffPercents: number[] = [];
      const hullDamagePercents: number[] = [];
      const hullRoFPercents: number[] = [];

      for (const bonus of fitting.hullBonuses) {
        if (bonus.turretSkill && turret.turretSkill !== bonus.turretSkill) continue;
        const percent = hullBonusPercent(bonus, skillLevel);
        if (bonus.attribute === "turretTracking") hullTrackingPercents.push(percent);
        if (bonus.attribute === "turretOptimal") hullOptimalPercents.push(percent);
        if (bonus.attribute === "turretFalloff") hullFalloffPercents.push(percent);
        if (bonus.attribute === "turretDamage") hullDamagePercents.push(percent);
        if (bonus.attribute === "turretRoF") hullRoFPercents.push(percent);
      }

      const trackingBonus = this.stacking.apply([...sharedTrackingPercents, ...hullTrackingPercents].map((p) => 1 + p / 100));
      const optimalBonus = this.stacking.apply([...sharedOptimalPercents, ...hullOptimalPercents].map((p) => 1 + p / 100));
      const falloffBonus = this.stacking.apply([...sharedFalloffPercents, ...hullFalloffPercents].map((p) => 1 + p / 100));

      const moduleDamageMultipliers = weaponGroup ? (damageMultipliersByGroup.get(weaponGroup) ?? []) : [];
      const moduleSpeedMultipliers = weaponGroup ? (speedMultipliersByGroup.get(weaponGroup) ?? []) : [];
      const moduleDamageBonus = this.stacking.apply(moduleDamageMultipliers);
      const moduleSpeedBonus = this.stacking.apply(moduleSpeedMultipliers);
      const hullDamageMultiplier = hullDamagePercents.reduce((acc, p) => acc * (1 + p / 100), 1);
      const hullRoFMultiplier = hullRoFPercents.reduce((acc, p) => acc * (1 + p / 100), 1);

      const skillDamageMultiplier = computeSkillDamageMultiplier(this.db.skillBonuses, turret.turretSkill, weaponGroup, turret.specializationSkill, skillLevel);

      const modifiedDamageMultiplier = turret.damageMultiplier * moduleDamageBonus * hullDamageMultiplier * skillDamageMultiplier;
      const modifiedCycleTime = turret.cycleTime * moduleSpeedBonus * hullRoFMultiplier * skillRoFMultiplier;

      const [overloadDamage, overloadCycle] = weaponOverloadMultipliers(this.gunFamilies.familyOf(group.moduleId), conditions.weaponOverloaded);
      const finalDamageMultiplier = modifiedDamageMultiplier * overloadDamage;
      const finalCycleTime = modifiedCycleTime * overloadCycle;

      const sigResClass = sigResolutionClassFromChargeSize(turret.chargeSize);
      const sigRes = SIG_RESOLUTIONS[sigResClass];
      const skillTrackingMultiplier = 1 + TRACKING_SKILL_BONUS * skillLevel;
      const skillOptimalMultiplier = 1 + OPTIMAL_SKILL_BONUS * skillLevel;
      const skillFalloffMultiplier = 1 + FALLOFF_SKILL_BONUS * skillLevel;

      const trackingScore = turret.tracking * skillTrackingMultiplier * trackingBonus;
      const optimalScore = turret.optimal * skillOptimalMultiplier * optimalBonus;
      const falloffScore = turret.falloff * skillFalloffMultiplier * falloffBonus;

      const base: ImportedTurretBase = {
        tracking: (trackingScore * sigRes) / STANDARD_SIGNATURE_RESOLUTION,
        optimal: optimalScore,
        falloff: falloffScore,
      };

      const turretForChargeSelection: ImportedTurret = {
        tracking: base.tracking,
        sigResolutionClass: sigResClass,
        optimal: base.optimal,
        falloff: base.falloff,
        chargeSize: turret.chargeSize,
        chargeId: chargeId ?? this.chargeCatalog.usualForChargeSize(turret.chargeSize),
        base,
        moduleId: group.moduleId,
        damageMultiplier: finalDamageMultiplier,
        damagePerShot: 0,
        cycleTime: finalCycleTime,
        turretCount: group.count,
      };
      const selectedCharge = chargeId && this.db.charges[chargeId] ? chargeId : this.chargeCatalog.usualForTurret(turretForChargeSelection);
      const charge = this.db.charges[selectedCharge] ?? {};
      const chargeDamage = (charge.emDamage ?? 0) + (charge.thermalDamage ?? 0) + (charge.kineticDamage ?? 0) + (charge.explosiveDamage ?? 0);

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
        damagePerShot: finalDamageMultiplier * chargeDamage,
        cycleTime: finalCycleTime,
        turretCount: group.count,
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

    const output = this.missileSkillModel.compute(launcherStats, missileStats, fitting.hullBonuses, conditions.skillLevel);
    const launcherOverloadCycle = conditions.weaponOverloaded ? WEAPON_OVERLOAD_ROF_MULTIPLIER : 1;
    return {
      moduleId: bestGroup.moduleId,
      name: launcherStats.name,
      count: bestGroup.count,
      chargeId,
      chargeName: missileStats.name,
      damagePerMissile: output.damagePerMissile,
      cycleTime: output.cycleTime * launcherOverloadCycle,
      explosionRadius: output.explosionRadius,
      explosionVelocity: output.explosionVelocity,
      damageReductionFactor: output.damageReductionFactor,
      maxVelocity: output.maxVelocity,
      flightTime: output.flightTime,
    };
  }

  resolveHull(fitting: FittingState, conditions: StatConditions): HullSideAggregation {
    let flatMass = 0;
    const massPercentages: number[] = [];
    const speedPercents: number[] = [];
    const agilityMultipliers: number[] = [];
    const sigPercents: number[] = [];
    let sigRadiusAdd = 0;

    for (const mod of [...fitting.supportModules, ...fitting.ewarModules]) {
      const stats = this.db.modules[mod.moduleId];
      if (!stats) continue;
      if (stats.massAddition) flatMass += stats.massAddition;
      if (stats.massBonusPercentage) massPercentages.push(stats.massBonusPercentage / 100);
      if (stats.speedBonusPercent) speedPercents.push(stats.speedBonusPercent / 100);
      if (stats.agilityMultiplier) agilityMultipliers.push(stats.agilityMultiplier);
      if (stats.agilityDrawbackPercent) agilityMultipliers.push(1 + stats.agilityDrawbackPercent / 100);
      if (stats.sigRadiusAdd) sigRadiusAdd += stats.sigRadiusAdd;
      if (stats.sigBonusPercent) sigPercents.push(stats.sigBonusPercent / 100);
      if (stats.sigDrawbackPercent) sigPercents.push(stats.sigDrawbackPercent / 100);
    }

    for (const bonus of fitting.hullBonuses) {
      const percent = hullBonusPercent(bonus, conditions.skillLevel);
      if (bonus.attribute === "maxVelocity") speedPercents.push(percent / 100);
      if (bonus.attribute === "agility") agilityMultipliers.push(1 + percent / 100);
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

  resolveEwar(fitting: FittingState): EwarLoadout {
    const scripts = disruptionScriptSpecsFrom(this.db.disruptionScripts);
    const scriptByName = new Map(scripts.map((s) => [s.name, s]));
    const webs: StasisWebSpec[] = [];
    const grapplers: StasisGrapplerSpec[] = [];
    const disruptors: TrackingDisruptorSpec[] = [];
    const scramblers: WarpScramblerSpec[] = [];

    for (const mod of fitting.ewarModules) {
      const webStats = this.db.stasisWebs[mod.moduleId];
      if (webStats) {
        webs.push({ moduleName: webStats.name, moduleId: webStats.id, maxRange: webStats.maxRange, speedFactor: Math.round(-webStats.speedFactorPercent * 10000) / 1000000, overloadRangeBonusPercent: webStats.overloadRangeBonusPercent });
        continue;
      }
      const grapplerStats = this.db.stasisGrapplers[mod.moduleId];
      if (grapplerStats) {
        grapplers.push({ moduleName: grapplerStats.name, moduleId: grapplerStats.id, optimal: grapplerStats.optimal, falloff: grapplerStats.falloff, speedFactor: Math.round(-grapplerStats.speedFactorPercent * 10000) / 1000000, overloadOptimalBonusPercent: grapplerStats.overloadOptimalBonusPercent });
        continue;
      }
      const disruptorStats = this.db.trackingDisruptors[mod.moduleId];
      if (disruptorStats) {
        const scriptName = mod.chargeId ? this.itemNameCatalog.nameForId(mod.chargeId, "en") : undefined;
        const defaultScript = scriptName ? scriptByName.get(scriptName) : undefined;
        disruptors.push({ moduleName: disruptorStats.name, moduleId: disruptorStats.id, optimal: disruptorStats.optimal, falloff: disruptorStats.falloff, disruption: Math.round(-disruptorStats.disruptionPercent * 10000) / 1000000, defaultScript, overloadStrengthBonusPercent: disruptorStats.overloadStrengthBonusPercent });
        continue;
      }
      const scramblerStats = this.db.warpScramblers[mod.moduleId];
      if (scramblerStats) {
        scramblers.push({ moduleName: scramblerStats.name, moduleId: scramblerStats.id, maxRange: scramblerStats.maxRange, overloadRangeBonusPercent: scramblerStats.overloadRangeBonusPercent });
      }
    }

    if (webs.length === 0 && grapplers.length === 0 && disruptors.length === 0 && scramblers.length === 0 && scripts.length === 0) return { webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], scripts: [] };
    return { webs, grapplers, disruptors, scramblers, painters: [], scripts };
  }

  resolveBoosts(fitting: FittingState): BoostLoadout {
    const scripts = scriptSpecsFrom(this.db.scripts);
    const scriptByName = new Map(scripts.map((s) => [s.name, s]));
    const computers: TrackingBoosterSpec[] = [];

    for (const mod of fitting.boosterModules) {
      const computerStats = this.db.trackingComputers[mod.moduleId];
      if (!computerStats) continue;
      const scriptName = mod.chargeId ? this.itemNameCatalog.nameForId(mod.chargeId, "en") : undefined;
      const defaultScript = scriptName ? scriptByName.get(scriptName) : undefined;
      computers.push({ moduleName: computerStats.name, moduleId: computerStats.id, trackingBonusPercent: computerStats.trackingBonusPercent, optimalBonusPercent: computerStats.optimalBonusPercent, falloffBonusPercent: computerStats.falloffBonusPercent, defaultScript });
    }

    return { computers, scripts };
  }

  resolveCargoCharges(fitting: FittingState): readonly { id: TypeId; quantity: number }[] {
    const charges: { id: TypeId; quantity: number }[] = [];
    for (const item of fitting.drones) {
      if (this.db.charges[item.id] || this.db.missiles[item.id]) charges.push({ id: item.id, quantity: item.quantity });
    }
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

function collectDamageModuleModifiers(stats: FittingModuleStats, damageMultipliersByGroup: Map<TurretWeaponGroup, number[]>, speedMultipliersByGroup: Map<TurretWeaponGroup, number[]>): void {
  if (!stats.turretWeaponGroup) return;
  const group = stats.turretWeaponGroup;
  if (stats.turretDamageMultiplier && stats.turretDamageMultiplier !== 1) {
    const list = damageMultipliersByGroup.get(group) ?? [];
    list.push(stats.turretDamageMultiplier);
    damageMultipliersByGroup.set(group, list);
  }
  if (stats.turretSpeedMultiplier && stats.turretSpeedMultiplier !== 1) {
    const list = speedMultipliersByGroup.get(group) ?? [];
    list.push(stats.turretSpeedMultiplier);
    speedMultipliersByGroup.set(group, list);
  }
}

function turretWeaponGroupFromSkill(turretSkill: string | undefined): TurretWeaponGroup | undefined {
  if (!turretSkill) return undefined;
  if (turretSkill.includes("Energy")) return "Energy Weapon";
  if (turretSkill.includes("Hybrid")) return "Hybrid Weapon";
  if (turretSkill.includes("Projectile")) return "Projectile Weapon";
  return undefined;
}

function computeSkillDamageMultiplier(skillBonuses: readonly SkillBonus[], turretSkill: string | undefined, weaponGroup: TurretWeaponGroup | undefined, specializationSkill: string | undefined, skillLevel: number): number {
  let multiplier = 1;
  for (const bonus of skillBonuses) {
    if (bonus.bonusType !== "turretDamage") continue;
    if (bonus.weaponGroup && bonus.weaponGroup !== weaponGroup) continue;
    if (bonus.turretSkill && bonus.turretSkill !== turretSkill) continue;
    if (bonus.specializationSkill && bonus.specializationSkill !== specializationSkill) continue;
    multiplier *= 1 + (bonus.magnitudePerLevel * skillLevel) / 100;
  }
  return multiplier;
}

function computeSkillRoFMultiplier(skillBonuses: readonly SkillBonus[], skillLevel: number): number {
  let multiplier = 1;
  for (const bonus of skillBonuses) {
    if (bonus.bonusType !== "turretRoF") continue;
    multiplier *= 1 + (bonus.magnitudePerLevel * skillLevel) / 100;
  }
  return multiplier;
}

function hullBonusPercent(bonus: HullBonus, skillLevel: number): number {
  return bonus.magnitude * (bonus.skill ? skillLevel : 1);
}

const WEAPON_OVERLOAD_DAMAGE_MULTIPLIER = 1.15;
const WEAPON_OVERLOAD_ROF_MULTIPLIER = 0.85;
const SHORT_RANGE_GUN_FAMILIES: ReadonlySet<GunFamily> = new Set(["pulseLaser", "blaster", "autocannon"]);

function weaponOverloadMultipliers(family: GunFamily, weaponOverloaded: boolean): readonly [damageMultiplier: number, cycleMultiplier: number] {
  if (!weaponOverloaded) return [1, 1] as const;
  if (SHORT_RANGE_GUN_FAMILIES.has(family)) return [WEAPON_OVERLOAD_DAMAGE_MULTIPLIER, 1] as const;
  return [1, WEAPON_OVERLOAD_ROF_MULTIPLIER] as const;
}
