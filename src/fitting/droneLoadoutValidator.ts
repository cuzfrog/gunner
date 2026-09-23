import type { DroneStats, FittingDb, HullBonus } from "../gamedata/fittingDb";
import type { ShipProfile } from "../ships";
import type { DroneGroup } from "./fittingState";
import { droneLoadoutLimits, type DroneLoadoutLimits } from "./droneLoadoutLimits";

export type DroneLoadoutViolation = "tooManyDrones" | "bandwidthExceeded" | "bayCapacityExceeded";

export interface DroneLoadoutValidation {
  readonly valid: boolean;
  readonly totalCount: number;
  readonly totalBandwidth: number;
  readonly totalVolume: number;
  readonly bandwidthLimit: number;
  readonly capacityLimit: number;
  readonly violations: readonly DroneLoadoutViolation[];
}

export interface DroneLoadoutValidator {
  validate(groups: readonly DroneGroup[], profile: ShipProfile, hullBonuses: readonly HullBonus[]): DroneLoadoutValidation;
}

interface DroneLoadoutValidatorDeps {
  readonly fittingDb: Pick<FittingDb, "combatDrones">;
}

export class DroneLoadoutValidatorImpl implements DroneLoadoutValidator {
  private readonly combatDrones: Readonly<Record<string, DroneStats>>;

  constructor({ fittingDb }: DroneLoadoutValidatorDeps) {
    this.combatDrones = fittingDb.combatDrones;
  }

  validate(groups: readonly DroneGroup[], profile: ShipProfile, hullBonuses: readonly HullBonus[]): DroneLoadoutValidation {
    let totalCount = 0;
    let totalBandwidth = 0;
    let totalVolume = 0;
    for (const group of groups) {
      const stats = this.combatDrones[group.typeId];
      totalCount += group.count;
      if (stats) {
        totalBandwidth += group.count * stats.bandwidth;
        totalVolume += group.count * stats.volume;
      }
    }
    const limits = droneLoadoutLimits(profile, hullBonuses);
    const violations = collectViolations(totalCount, totalBandwidth, totalVolume, limits);
    return { valid: violations.length === 0, totalCount, totalBandwidth, totalVolume, bandwidthLimit: limits.bandwidthLimit, capacityLimit: limits.capacityLimit, violations };
  }
}

function collectViolations(totalCount: number, totalBandwidth: number, totalVolume: number, limits: DroneLoadoutLimits): DroneLoadoutViolation[] {
  const violations: DroneLoadoutViolation[] = [];
  if (totalCount > limits.maxActiveDrones) violations.push("tooManyDrones");
  if (totalBandwidth > limits.bandwidthLimit) violations.push("bandwidthExceeded");
  if (totalVolume > limits.capacityLimit) violations.push("bayCapacityExceeded");
  return violations;
}
