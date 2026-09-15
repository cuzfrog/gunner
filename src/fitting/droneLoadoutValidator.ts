import type { DroneStats, FittingDb, HullBonus, ShipStatFlatAttribute } from "../gamedata/fittingDb";
import type { ShipProfile } from "../ships";
import type { DroneGroup } from "./fittingState";

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
    const bandwidthLimit = profile.droneBandwidth + flatSum(hullBonuses, "droneBandwidthFlat");
    const capacityLimit = profile.droneCapacity + flatSum(hullBonuses, "droneCapacityFlat");
    const violations = collectViolations(totalCount, totalBandwidth, totalVolume, profile, bandwidthLimit, capacityLimit);
    return { valid: violations.length === 0, totalCount, totalBandwidth, totalVolume, bandwidthLimit, capacityLimit, violations };
  }
}

function collectViolations(totalCount: number, totalBandwidth: number, totalVolume: number, profile: ShipProfile, bandwidthLimit: number, capacityLimit: number): DroneLoadoutViolation[] {
  const violations: DroneLoadoutViolation[] = [];
  if (totalCount > profile.maxActiveDrones) violations.push("tooManyDrones");
  if (totalBandwidth > bandwidthLimit) violations.push("bandwidthExceeded");
  if (totalVolume > capacityLimit) violations.push("bayCapacityExceeded");
  return violations;
}

function flatSum(hullBonuses: readonly HullBonus[], attribute: ShipStatFlatAttribute): number {
  return hullBonuses.reduce((sum, bonus) => (bonus.attribute === attribute ? sum + bonus.magnitude : sum), 0);
}
