import type { FittingCalculator } from "./fittingCalculator";
import type { DroneGroup, FittingState } from "./fittingState";
import type { ImportedDrone } from "./droneCatalog";
import type { StatConditions } from "../ships";
import type { FittedModule } from "./fittingState";
import type { DroneStats, FittingDb, HullBonus } from "../gamedata/fittingDb";
import type { ShipProfile } from "../ships";
import { droneLoadoutLimits, type DroneLoadoutLimits } from "./droneLoadoutLimits";

export interface DroneLoadoutContext {
  readonly profile: ShipProfile;
  readonly hullBonuses: readonly HullBonus[];
  readonly droneBoosterModules: readonly FittedModule[];
}

export interface DroneLoadoutResolver {
  resolve(groups: readonly DroneGroup[], fitting: DroneLoadoutContext, conditions: StatConditions): readonly ImportedDrone[];
}

interface DroneLoadoutResolverDeps {
  readonly fittingCalculator: FittingCalculator;
  readonly fittingDb: Pick<FittingDb, "combatDrones">;
}

export class DroneLoadoutResolverImpl implements DroneLoadoutResolver {
  private readonly calculator: FittingCalculator;
  private readonly combatDrones: Readonly<Record<string, DroneStats>>;

  constructor({ fittingCalculator, fittingDb }: DroneLoadoutResolverDeps) {
    this.calculator = fittingCalculator;
    this.combatDrones = fittingDb.combatDrones;
  }

  resolve(groups: readonly DroneGroup[], fitting: DroneLoadoutContext, conditions: StatConditions): readonly ImportedDrone[] {
    const launched = launchClampedGroups(groups, droneLoadoutLimits(fitting.profile, fitting.hullBonuses), this.combatDrones);
    if (launched.length === 0) return [];
    const state = syntheticFittingState(fitting, launched);
    return this.calculator.resolveDrones(state, conditions);
  }
}

function syntheticFittingState(context: DroneLoadoutContext, groups: readonly DroneGroup[]): FittingState {
  return {
    profile: context.profile,
    hullBonuses: context.hullBonuses,
    supportModules: [],
    defenseModules: [],
    turretGroups: [],
    launcherGroups: [],
    vortonGroups: [],
    propulsionModule: undefined,
    ewarModules: [],
    boosterModules: [],
    missileBoosterModules: [],
    droneBoosterModules: context.droneBoosterModules,
    droneGroups: groups,
    fighterGroups: [],
    drones: [],
    cargo: [],
    sensorBoosterModules: [],
    sensorAmplifierModules: [],
    commandBurstModules: [],
  };
}

/** Projects the bay loadout onto the launch budget: drones sent to attack are the launched subset, never exceeding the bandwidth or active-drone limits. */
function launchClampedGroups(groups: readonly DroneGroup[], limits: DroneLoadoutLimits, combatDrones: Readonly<Record<string, DroneStats>>): DroneGroup[] {
  const launched: DroneGroup[] = [];
  let remainingBandwidth = limits.bandwidthLimit;
  let remainingSlots = limits.maxActiveDrones;
  for (const group of groups) {
    const stats = combatDrones[group.typeId];
    if (!stats) continue;
    const count = Math.min(group.activeCount, stats.bandwidth > 0 ? Math.floor(remainingBandwidth / stats.bandwidth) : group.activeCount, remainingSlots);
    if (count <= 0) continue;
    launched.push({ typeId: group.typeId, count, activeCount: count });
    remainingBandwidth -= count * stats.bandwidth;
    remainingSlots -= count;
  }
  return launched;
}
