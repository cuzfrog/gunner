import type { ChargeStats, FittingDb, HullBonus, ShipStatFlatAttribute } from "../gamedata/fittingDb";
import type { TypeId } from "../gamedata/ids";
import { type CapacitorSkills, type StatConditions, defaultCapacitorSkills } from "../ships";
import { type BoostLoadout, type CapacitorSpec, type CommandBurstSpec, type DefenseSpec, type EwarLoadout, type MissileBoosterLoadout, scheduledDrainsFromProjections, type ScheduledDrain, type SensorBoostLoadout, type StackingPenalty } from "../sim";
import { runCapSim, type StaticDrain } from "./capacitorSim";
import type { FittingState } from "./fittingState";
import { moduleSkillMultiplier } from "./skillMultiplier";

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
  /** The lock-gated weapons subset of usagePerSecond (turrets; missiles and drones cost nothing). */
  readonly weaponsPerSecond: number;
  readonly boosters: readonly CapacitorBoosterStats[];
  readonly stablePercent?: number; // pyfa watermark average, when cap-stable
  readonly depletesInSeconds?: number; // seconds until the pool depletes, when unstable
}

export interface CapacitorTurretDrain {
  readonly moduleId: TypeId;
  readonly capacitorNeed: number; // GJ per cycle per turret (charge/skill/hull modified)
  readonly cycleTime: number; // seconds
  readonly count: number;
}

/** Resolved products the capacitor rows and the runtime drains both derive from. The propulsion item id is the live selection (variant or base); undefined disables the propulsion drain. */
export interface CapacitorDrainSources {
  readonly defense: DefenseSpec;
  readonly turretDrains: readonly CapacitorTurretDrain[];
  readonly ewar: EwarLoadout;
  readonly boosts: BoostLoadout;
  readonly missileBoosts: MissileBoosterLoadout;
  readonly sensorBoosts: SensorBoostLoadout;
  readonly commandBursts: readonly CommandBurstSpec[];
  readonly propulsionModuleId: TypeId | undefined;
}

export interface CapacitorCalculator {
  resolve(fitting: FittingState, conditions: StatConditions, sources: CapacitorDrainSources): CapacitorStats;
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

  resolve(fitting: FittingState, conditions: StatConditions, sources: CapacitorDrainSources): CapacitorStats {
    const skills = conditions.capacitorSkills ?? defaultCapacitorSkills(conditions.skillLevel);
    const spec = resolveSpec(this.db, fitting, skills, this.stacking);
    const propulsion = sources.propulsionModuleId !== undefined ? this.db.modules[sources.propulsionModuleId]?.propulsion : undefined;
    const effective = multiplyCapacity(spec, propulsion?.capacitorCapacityMultiplier);
    const rows = buildUsageRows(this.db, conditions, sources);
    const injectors = buildInjectorDrains(fitting, this.db);
    const usagePerSecond = rows.reduce((sum, row) => sum + row.perSecond * row.count, 0);
    const weaponsPerSecond = weaponsDrainPerSecond(sources.turretDrains);
    const drains: readonly StaticDrain[] = [...rows.map((row) => ({ amount: row.amount, interval: row.cycleTime, count: row.count })), ...injectors];
    const sim = runCapSim({ spec: effective, drains });
    const stablePercent = sim.stable ? ((sim.stableLow + sim.stableHigh) / 2 / effective.capacity) * 100 : undefined;
    const depletesInSeconds = sim.stable ? undefined : sim.depletesAt;
    return {
      spec,
      peakRecharge: (2.5 * effective.capacity) / effective.rechargeTime,
      rows,
      usagePerSecond,
      weaponsPerSecond,
      boosters: buildBoosterStats(this.db, fitting),
      ...(stablePercent !== undefined ? { stablePercent } : {}),
      ...(depletesInSeconds !== undefined ? { depletesInSeconds } : {}),
    };
  }
}

function resolveSpec(db: FittingDb, fitting: FittingState, skills: CapacitorSkills, stacking: StackingPenalty): CapacitorSpec {  const profile = fitting.profile;
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
  const capacityAdd = capacityAdds.reduce((sum, add) => sum + add, 0) + flatSum(fitting.hullBonuses, "capacitorCapacityFlat");

  // pyfa order: flat battery adds apply before percent multipliers (pre-increase), skills apply on top
  const capacity = (profile.capacitorCapacity + capacityAdd) * capacityMultiplier * (1 + ENERGY_MANAGEMENT_BONUS * skills.energyManagement);
  const rechargeTime = profile.capacitorRechargeTime * rechargeMultiplier * (1 - ENERGY_SYSTEMS_OPERATIONS_BONUS * skills.energySystemsOperations);
  return { capacity, rechargeTime };
}

function flatSum(hullBonuses: readonly HullBonus[], attribute: ShipStatFlatAttribute): number {
  return hullBonuses.reduce((sum, bonus) => (bonus.attribute === attribute ? sum + bonus.magnitude : sum), 0);
}

/** Propulsion capacity penalty (e.g. MWD -25%) applies at the consumer: the exported spec stays propulsion-independent. */
function multiplyCapacity(spec: CapacitorSpec, multiplier: number | undefined): CapacitorSpec {
  if (multiplier === undefined || multiplier === 1) return spec;
  return { capacity: spec.capacity * multiplier, rechargeTime: spec.rechargeTime };
}

function buildUsageRows(db: FittingDb, conditions: StatConditions, sources: CapacitorDrainSources): readonly CapacitorUsageRow[] {
  const rows: CapacitorUsageRow[] = [];

  for (const turret of sources.turretDrains) {
    if (turret.capacitorNeed <= 0) continue;
    rows.push(buildRow(turret.moduleId, turretNameFor(db, turret.moduleId), turret.capacitorNeed, turret.cycleTime, turret.count));
  }

  // Same extraction the runtime uses for its scheduled drains: the static rows cannot diverge from the sim.
  const drains = scheduledDrainsFromProjections({ loadout: sources.ewar }, { loadout: sources.boosts }, { loadout: sources.missileBoosts }, { loadout: sources.sensorBoosts }, sources.commandBursts);
  rows.push(...drainRows(db, drains));

  for (const repairer of sources.defense.repairers) {
    if (repairer.capacitorNeed <= 0 || !repairer.moduleId) continue;
    const overloadCycle = conditions.overloaded ? repairer.overload.cycleTimeMultiplier : 1;
    rows.push(buildRow(repairer.moduleId, moduleNameFor(db, repairer.moduleId), repairer.capacitorNeed, repairer.cycleTime * overloadCycle, 1));
  }

  const rah = sources.defense.rah;
  if (rah?.moduleId && (rah.capacitorNeed ?? 0) > 0) {
    const overloadCycle = conditions.overloaded ? rah.overloadCycleTimeMultiplier : 1;
    rows.push(buildRow(rah.moduleId, moduleNameFor(db, rah.moduleId), rah.capacitorNeed ?? 0, rah.cycleTime * overloadCycle, 1));
  }

  const propulsionModuleId = sources.propulsionModuleId;
  const propulsion = propulsionModuleId !== undefined ? db.modules[propulsionModuleId]?.propulsion : undefined;
  if (propulsionModuleId !== undefined && propulsion && propulsion.capacitorNeed > 0) {
    const capMultiplier = moduleSkillMultiplier(db.skillBonuses, propulsion.requiredSkillIds, "capUse", conditions.skillLevel);
    const durationMultiplier = moduleSkillMultiplier(db.skillBonuses, propulsion.requiredSkillIds, "duration", conditions.skillLevel);
    rows.push(buildRow(propulsionModuleId, moduleNameFor(db, propulsionModuleId), propulsion.capacitorNeed * capMultiplier, propulsion.cycleTime * durationMultiplier, 1));
  }

  return rows;
}

function drainRows(db: FittingDb, drains: readonly ScheduledDrain[]): readonly CapacitorUsageRow[] {
  const grouped = new Map<TypeId, { amount: number; interval: number; count: number }>();
  for (const drain of drains) {
    const existing = grouped.get(drain.moduleId);
    if (existing) existing.count += 1;
    else grouped.set(drain.moduleId, { amount: drain.amount, interval: drain.interval, count: 1 });
  }
  return [...grouped.entries()].map(([moduleId, group]) => buildRow(moduleId, moduleNameFor(db, moduleId), group.amount, group.interval, group.count));
}

/** Exact weapons subset of usagePerSecond: the turret rows' per-second figure, from the same specs the rows are built from. */
function weaponsDrainPerSecond(turrets: readonly CapacitorTurretDrain[]): number {
  return turrets.reduce((sum, turret) => (turret.capacitorNeed > 0 && turret.cycleTime > 0 ? sum + (turret.capacitorNeed * turret.count) / turret.cycleTime : sum), 0);
}

function buildRow(moduleId: TypeId, moduleName: string, amount: number, cycleTime: number, count: number): CapacitorUsageRow {
  return { moduleId, moduleName, amount, cycleTime, perSecond: amount / cycleTime, count };
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

/** Display names for drain row modules; family catalogs cover ids absent from db.modules (e.g. tracking computers). */
function moduleNameFor(db: FittingDb, moduleId: TypeId): string {
  const family = db.stasisWebs[moduleId] ?? db.stasisGrapplers[moduleId] ?? db.trackingDisruptors[moduleId] ?? db.warpScramblers[moduleId] ?? db.targetPainters[moduleId] ?? db.sensorDampeners[moduleId] ?? db.trackingComputers[moduleId] ?? db.missileGuidanceComputers[moduleId] ?? db.sensorBoosters[moduleId] ?? db.commandBursts[moduleId];
  return db.modules[moduleId]?.name ?? family?.name ?? "";
}

function turretNameFor(db: FittingDb, moduleId: TypeId): string {
  return db.turrets[moduleId]?.name ?? "";
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

const CAP_BOOSTER_CHARGE_GROUP = 87;
const ENERGY_MANAGEMENT_BONUS = 0.05;
const ENERGY_SYSTEMS_OPERATIONS_BONUS = 0.05;
