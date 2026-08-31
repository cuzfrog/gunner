import type { FittingCalculator } from "./fittingCalculator";
import type { DroneGroup, FittingState } from "./fittingState";
import type { ImportedDrone } from "./droneCatalog";
import type { StatConditions } from "../ships";
import type { FittedModule } from "./fittingState";
import type { HullBonus } from "../gamedata/fittingDb";
import type { ShipProfile } from "../ships";

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
}

export class DroneLoadoutResolverImpl implements DroneLoadoutResolver {
  private readonly calculator: FittingCalculator;

  constructor({ fittingCalculator }: DroneLoadoutResolverDeps) {
    this.calculator = fittingCalculator;
  }

  resolve(groups: readonly DroneGroup[], fitting: DroneLoadoutContext, conditions: StatConditions): readonly ImportedDrone[] {
    if (groups.length === 0) return [];
    const state = syntheticFittingState(fitting, groups);
    return this.calculator.resolveDrones(state, conditions);
  }
}

function syntheticFittingState(context: DroneLoadoutContext, groups: readonly DroneGroup[]): FittingState {
  return {
    profile: context.profile,
    hullBonuses: context.hullBonuses,
    supportModules: [],
    turretGroups: [],
    launcherGroups: [],
    propulsionModule: undefined,
    ewarModules: [],
    boosterModules: [],
    missileBoosterModules: [],
    droneBoosterModules: context.droneBoosterModules,
    droneGroups: groups,
    drones: [],
    cargo: [],
  };
}
