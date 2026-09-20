import type { FittingCalculator } from "./fittingCalculator";
import type { FittedModule, FittingState } from "./fittingState";
import type { FighterGroup } from "./fighterCatalog";
import type { ImportedFighter } from "./fighterCatalog";
import type { StatConditions } from "../ships";
import type { HullBonus } from "../gamedata/fittingDb";
import type { ShipProfile } from "../ships";

export interface FighterLoadoutContext {
  readonly profile: ShipProfile;
  readonly hullBonuses: readonly HullBonus[];
  readonly droneBoosterModules: readonly FittedModule[];
}

export interface FighterLoadoutResolver {
  resolve(groups: readonly FighterGroup[], fitting: FighterLoadoutContext, conditions: StatConditions): readonly ImportedFighter[];
}

interface FighterLoadoutResolverDeps {
  readonly fittingCalculator: FittingCalculator;
}

export class FighterLoadoutResolverImpl implements FighterLoadoutResolver {
  private readonly calculator: FittingCalculator;

  constructor({ fittingCalculator }: FighterLoadoutResolverDeps) {
    this.calculator = fittingCalculator;
  }

  resolve(groups: readonly FighterGroup[], fitting: FighterLoadoutContext, conditions: StatConditions): readonly ImportedFighter[] {
    if (groups.length === 0) return [];
    const state = syntheticFittingState(fitting, groups);
    return this.calculator.resolveFighters(state, conditions);
  }
}

function syntheticFittingState(context: FighterLoadoutContext, groups: readonly FighterGroup[]): FittingState {
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
    droneGroups: [],
    fighterGroups: groups,
    drones: [],
    cargo: [],
    sensorBoosterModules: [],
    sensorAmplifierModules: [],
    commandBurstModules: [],
  };
}
