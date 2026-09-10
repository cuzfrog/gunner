import type { ChargeStats, FittingDb, FittingModuleStats } from "../gamedata/fittingDb";
import type { TypeId } from "../gamedata/ids";
import { type CapacitorSkills, type StatConditions, defaultCapacitorSkills } from "../ships";
import { type CapacitorSpec, type DefenseSpec, type StackingPenalty } from "../sim";
import { runCapSim, type StaticDrain } from "./capacitorSim";
import type { FittingState } from "./fittingState";

export interface CapacitorUsageRow {
  readonly moduleId: TypeId;
  readonly moduleName: string;
  readonly amount: number; // GJ per activation per module instance
  readonly cycleTime: number; // seconds, overload-adjusted where applicable
  readonly perSecond: number; // amount / cycleTime
  readonly count: number;
}

export interface CapacitorBoosterChargeOption {
  readonly id: TypeId;
  readonly name: string;
  readonly amount: number; // GJ injected per charge
  readonly clipSize: number; // floor(chargeCapacity / charge volume)
}

export interface CapacitorBoosterStats {
  readonly moduleId: TypeId;
  readonly moduleName: string;
  readonly chargeId?: TypeId; // charge loaded by the fitting
  readonly cycleTime: number; // seconds
  readonly reloadTime: number; // seconds
  readonly chargeOptions: readonly CapacitorBoosterChargeOption[];
}

export interface CapacitorStats {
  readonly spec: CapacitorSpec;
  readonly peakRecharge: number; // GJ/s at 25% capacity: 2.5 * capacity / rechargeTime
  readonly rows: readonly CapacitorUsageRow[];
  readonly usagePerSecond: number;
  readonly boosters: readonly CapacitorBoosterStats[];
  readonly stablePercent?: number; // pyfa watermark average, when cap-stable
  readonly depletesInSeconds?: number; // seconds until the pool depletes, when unstable
}

export interface CapacitorCalculator {
  resolve(fitting: FittingState, conditions: StatConditions, defense: DefenseSpec): CapacitorStats;
}

interface CapacitorCalculatorDeps {
  readonly fittingDb: FittingDb;
  readonly stackingPenalty: StackingPenalty;
}

export class CapacitorCalculatorImpl implements CapacitorCalculator {
  private readonly db: FittingDb;
  private readonly stacking: StackingPenalty;

  constructor({ fittingDb, stackingPenalty }: CapacitorCalculatorDeps) {
    this.db = fittingDb;
    this.stacking = stackingPenalty;
  }

  resolve(fitting: FittingState, conditions: StatConditions, defense: DefenseSpec): CapacitorStats {
    const skills = conditions.capacitorSkills ?? defaultCapacitorSkills(conditions.skillLevel);
    const spec = resolveSpec(this.db, fitting, skills, this.stacking);
    const propulsion = fitting.propulsionModule ? this.db.modules[fitting.propulsionModule.moduleId]?.propulsion : undefined;
    const effective = multiplyCapacity(spec, propulsion?.capacitorCapacityMultiplier);
    const rows = buildUsageRows(this.db, fitting, conditions, defense);
    const injectors = buildInjectorDrains(fitting, this.db);
    const usagePerSecond = rows.reduce((sum, row) => sum + row.perSecond * row.count, 0);
    const drains: readonly StaticDrain[] = [...rows.map((row) => ({ amount: row.amount, interval: row.cycleTime, count: row.count })), ...injectors];
    const sim = runCapSim({ spec: effective, drains });
    const stablePercent = sim.stable ? ((sim.stableLow + sim.stableHigh) / 2 / effective.capacity) * 100 : undefined;
    const depletesInSeconds = sim.stable ? undefined : sim.depletesAt;
    return {
      spec,
      peakRecharge: (2.5 * effective.capacity) / effective.rechargeTime,
      rows,
      usagePerSecond,
      boosters: buildBoosterStats(this.db, fitting),
      ...(stablePercent !== undefined ? { stablePercent } : {}),
      ...(depletesInSeconds !== undefined ? { depletesInSeconds } : {}),
    };
  }
}

function resolveSpec(db: FittingDb, fitting: FittingState, skills: CapacitorSkills, stacking: StackingPenalty): CapacitorSpec {
  const profile = fitting.profile;
  const capacityMultipliers: number[] = [];
  const rechargeMultipliers: number[] = [];
  const capacityAdds: number[] = [];

  for (const moduleId of collectFittedModuleIds(fitting)) {
    const capacitor = db.modules[moduleId]?.capacitor;
    if (!capacitor) continue;
    if (capacitor.capacityMultiplier !== undefined) capacityMultipliers.push(capacitor.capacityMultiplier);
    if (capacitor.rechargeMultiplier !== undefined) rechargeMultipliers.push(capacitor.rechargeMultiplier);
    if (capacitor.capacityAdd !== undefined) capacityAdds.push(capacitor.capacityAdd);
  }

  const capacityMultiplier = capacityMultipliers.length > 0 ? stacking.apply(capacityMultipliers) : 1;
  const rechargeMultiplier = rechargeMultipliers.length > 0 ? stacking.apply(rechargeMultipliers) : 1;
  const capacityAdd = capacityAdds.reduce((sum, add) => sum + add, 0);

  // pyfa order: flat battery adds apply before percent multipliers (pre-increase), skills apply on top
  const capacity = (profile.capacitorCapacity + capacityAdd) * capacityMultiplier * (1 + ENERGY_MANAGEMENT_BONUS * skills.energyManagement);
  const rechargeTime = profile.capacitorRechargeTime * rechargeMultiplier * (1 - ENERGY_SYSTEMS_OPERATIONS_BONUS * skills.energySystemsOperations);
  return { capacity, rechargeTime };
}

/** Propulsion capacity penalty (e.g. MWD -25%) applies at the consumer: the exported spec stays propulsion-independent. */
function multiplyCapacity(spec: CapacitorSpec, multiplier: number | undefined): CapacitorSpec {
  if (multiplier === undefined || multiplier === 1) return spec;
  return { capacity: spec.capacity * multiplier, rechargeTime: spec.rechargeTime };
}

function buildUsageRows(db: FittingDb, fitting: FittingState, conditions: StatConditions, defense: DefenseSpec): readonly CapacitorUsageRow[] {
  const rows: CapacitorUsageRow[] = [];

  for (const group of fitting.turretGroups) {
    const stats = db.turrets[group.moduleId];
    if (!stats || stats.capacitorNeed <= 0) continue;
    const cycleTime = stats.cycleTime * (conditions.weaponOverloaded ? WEAPON_OVERLOAD_ROF_MULTIPLIER : 1);
    rows.push(buildRow(group.moduleId, stats.name, stats.capacitorNeed, cycleTime, group.count));
  }

  for (const moduleId of collectFittedModuleIds(fitting)) {
    const family = findActiveCapFamily(db, moduleId);
    if (!family) continue;
    rows.push(buildRow(moduleId, family.moduleName, family.capacitorNeed, family.cycleTime, 1));
  }

  for (const repairer of defense.repairers) {
    if (repairer.capacitorNeed <= 0 || !repairer.moduleId) continue;
    const overloadCycle = conditions.overloaded ? repairer.overload.cycleTimeMultiplier : 1;
    const moduleName = db.modules[repairer.moduleId]?.name ?? "";
    rows.push(buildRow(repairer.moduleId, moduleName, repairer.capacitorNeed, repairer.cycleTime * overloadCycle, 1));
  }

  for (const mod of fitting.defenseModules) {
    const defenseStats = db.modules[mod.moduleId]?.defense;
    if (!defenseStats || defenseStats.kind !== "rah") continue;
    const { capacitorNeed, cycleTime } = defenseStats;
    if (capacitorNeed === undefined || capacitorNeed <= 0 || cycleTime === undefined) continue;
    const overloadCycle = conditions.overloaded ? (defenseStats.overloadCycleTimeMultiplier ?? 1) : 1;
    const moduleName = db.modules[mod.moduleId]?.name ?? "";
    rows.push(buildRow(mod.moduleId, moduleName, capacitorNeed, cycleTime * overloadCycle, 1));
  }

  const propulsionModule = fitting.propulsionModule;
  const propulsion = propulsionModule ? db.modules[propulsionModule.moduleId]?.propulsion : undefined;
  if (propulsionModule && propulsion && propulsion.capacitorNeed > 0) {
    const moduleName = db.modules[propulsionModule.moduleId]?.name ?? "";
    rows.push(buildRow(propulsionModule.moduleId, moduleName, propulsion.capacitorNeed, PROPULSION_CYCLE_TIME, 1));
  }

  return rows;
}

function buildRow(moduleId: TypeId, moduleName: string, amount: number, cycleTime: number, count: number): CapacitorUsageRow {
  return { moduleId, moduleName, amount, cycleTime, perSecond: amount / cycleTime, count };
}

interface ActiveCapFamily {
  readonly moduleName: string;
  readonly capacitorNeed: number;
  readonly cycleTime: number;
}

/** Capacitor-consuming active stats across the fittingDb family catalogs. */
function findActiveCapFamily(db: FittingDb, moduleId: TypeId): ActiveCapFamily | undefined {
  // Omnidirectional tracking links are deliberately absent: phase 3 scoped their drain out of the
  // runtime simulation (drones run their own pool; the effect is pre-baked into drone stats), so
  // the static usage rows must not include a drain that never happens.
  const family = db.stasisWebs[moduleId] ?? db.stasisGrapplers[moduleId] ?? db.trackingDisruptors[moduleId] ?? db.warpScramblers[moduleId] ?? db.targetPainters[moduleId] ?? db.sensorDampeners[moduleId] ?? db.trackingComputers[moduleId] ?? db.missileGuidanceComputers[moduleId] ?? db.sensorBoosters[moduleId];
  if (family) return { moduleName: family.name, capacitorNeed: family.capacitorNeed, cycleTime: family.cycleTime };
  const stats: FittingModuleStats | undefined = db.modules[moduleId];
  if (stats?.neutralizer) return { moduleName: stats.name, capacitorNeed: stats.neutralizer.capacitorNeed, cycleTime: stats.neutralizer.cycleTime };
  return undefined;
}

function collectFittedModuleIds(fitting: FittingState): readonly TypeId[] {
  return [
    ...fitting.supportModules,
    ...fitting.defenseModules,
    ...fitting.ewarModules,
    ...fitting.boosterModules,
    ...fitting.missileBoosterModules,
    ...fitting.droneBoosterModules,
    ...fitting.sensorBoosterModules,
    ...fitting.sensorAmplifierModules,
  ].map((mod) => mod.moduleId);
}

/** Cap booster injectors: one StaticDrain per fitted booster with a loaded charge (auto mode). */
export function buildInjectorDrains(fitting: FittingState, db: FittingDb): readonly StaticDrain[] {
  const drains: StaticDrain[] = [];
  for (const mod of fitting.supportModules) {
    const booster = db.modules[mod.moduleId]?.capacitor;
    if (!booster || booster.kind !== "capacitorBooster" || !mod.chargeId) continue;
    const charge: ChargeStats | undefined = db.charges[mod.chargeId];
    if (!charge?.capacitorBonus || !charge.volume || !booster.cycleTime || !booster.reloadTime || !booster.chargeCapacity) continue;
    drains.push({
      amount: charge.capacitorBonus,
      interval: booster.cycleTime,
      clipSize: Math.floor(booster.chargeCapacity / charge.volume),
      reloadTime: booster.reloadTime,
      injector: true,
    });
  }
  return drains;
}

/** Fitted cap boosters with every group-87 charge that fits their charge capacity (pyfa volume rule). */
function buildBoosterStats(db: FittingDb, fitting: FittingState): readonly CapacitorBoosterStats[] {
  const result: CapacitorBoosterStats[] = [];
  for (const mod of fitting.supportModules) {
    const booster = db.modules[mod.moduleId]?.capacitor;
    if (!booster || booster.kind !== "capacitorBooster" || !booster.cycleTime || !booster.reloadTime || !booster.chargeCapacity) continue;
    const chargeOptions: CapacitorBoosterChargeOption[] = [];
    for (const charge of Object.values(db.charges)) {
      if (charge.chargeGroup !== CAP_BOOSTER_CHARGE_GROUP || !charge.capacitorBonus || !charge.volume) continue;
      if (charge.volume > booster.chargeCapacity) continue;
      chargeOptions.push({ id: charge.id, name: charge.name, amount: charge.capacitorBonus, clipSize: Math.floor(booster.chargeCapacity / charge.volume) });
    }
    result.push({
      moduleId: mod.moduleId,
      moduleName: db.modules[mod.moduleId]?.name ?? "",
      ...(mod.chargeId !== undefined ? { chargeId: mod.chargeId } : {}),
      cycleTime: booster.cycleTime,
      reloadTime: booster.reloadTime,
      chargeOptions,
    });
  }
  return result;
}

const PROPULSION_CYCLE_TIME = 10; // seconds, fixed propulsion cycle
const CAP_BOOSTER_CHARGE_GROUP = 87;
const WEAPON_OVERLOAD_ROF_MULTIPLIER = 0.85;
const ENERGY_MANAGEMENT_BONUS = 0.05;
const ENERGY_SYSTEMS_OPERATIONS_BONUS = 0.05;
