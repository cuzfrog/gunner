import type { DroneStats, FittingDb, HullBonus } from "../gamedata/fittingDb";
import type { ShipProfile } from "../ships";
import type { DroneGroup } from "./fittingState";
import { droneLoadoutLimits, type DroneLoadoutLimits } from "./droneLoadoutLimits";

export type DroneLoadoutViolation = "tooManyDrones" | "bandwidthExceeded" | "bayCapacityExceeded";

export interface DroneLoadoutValidation {
  readonly valid: boolean;
  /** Drones stored in the bay (idle + launched). */
  readonly totalCount: number;
  /** Drones launched into combat. */
  readonly activeCount: number;
  /** Bandwidth consumed by the launched drones. */
  readonly activeBandwidth: number;
  /** Volume of the stored drones (idle + launched). */
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
    let activeCount = 0;
    let activeBandwidth = 0;
    let totalVolume = 0;
    for (const group of groups) {
      const stats = this.combatDrones[group.typeId];
      totalCount += group.count;
      activeCount += group.activeCount;
      if (stats) {
        activeBandwidth += group.activeCount * stats.bandwidth;
        totalVolume += group.count * stats.volume;
      }
    }
    const limits = droneLoadoutLimits(profile, hullBonuses);
    const violations = collectViolations(activeCount, activeBandwidth, totalVolume, limits);
    return { valid: violations.length === 0, totalCount, activeCount, activeBandwidth, totalVolume, bandwidthLimit: limits.bandwidthLimit, capacityLimit: limits.capacityLimit, violations };
  }
}

/** Bay storage is capacity-limited only; the launch budget (slots + bandwidth) applies to the launched set. */
function collectViolations(activeCount: number, activeBandwidth: number, totalVolume: number, limits: DroneLoadoutLimits): DroneLoadoutViolation[] {
  const violations: DroneLoadoutViolation[] = [];
  if (activeCount > limits.maxActiveDrones) violations.push("tooManyDrones");
  if (activeBandwidth > limits.bandwidthLimit) violations.push("bandwidthExceeded");
  if (totalVolume > limits.capacityLimit) violations.push("bayCapacityExceeded");
  return violations;
}
