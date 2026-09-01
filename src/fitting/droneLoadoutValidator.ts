import type { DroneStats, FittingDb } from "../gamedata/fittingDb";
import type { ShipProfile } from "../ships";
import type { DroneGroup } from "./fittingState";

export type DroneLoadoutViolation = "tooManyDrones" | "bandwidthExceeded" | "bayCapacityExceeded";

export interface DroneLoadoutValidation {
  readonly valid: boolean;
  readonly totalCount: number;
  readonly totalBandwidth: number;
  readonly totalVolume: number;
  readonly violations: readonly DroneLoadoutViolation[];
}

export interface DroneLoadoutValidator {
  validate(groups: readonly DroneGroup[], profile: ShipProfile): DroneLoadoutValidation;
}

interface DroneLoadoutValidatorDeps {
  readonly fittingDb: Pick<FittingDb, "combatDrones">;
}

export class DroneLoadoutValidatorImpl implements DroneLoadoutValidator {
  private readonly combatDrones: Readonly<Record<string, DroneStats>>;

  constructor({ fittingDb }: DroneLoadoutValidatorDeps) {
    this.combatDrones = fittingDb.combatDrones;
  }

  validate(groups: readonly DroneGroup[], profile: ShipProfile): DroneLoadoutValidation {
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
    const violations = collectViolations(totalCount, totalBandwidth, totalVolume, profile);
    return { valid: violations.length === 0, totalCount, totalBandwidth, totalVolume, violations };
  }
}

function collectViolations(totalCount: number, totalBandwidth: number, totalVolume: number, profile: ShipProfile): DroneLoadoutViolation[] {
  const violations: DroneLoadoutViolation[] = [];
  if (totalCount > profile.maxActiveDrones) violations.push("tooManyDrones");
  if (totalBandwidth > profile.droneBandwidth) violations.push("bandwidthExceeded");
  if (totalVolume > profile.droneCapacity) violations.push("bayCapacityExceeded");
  return violations;
}
