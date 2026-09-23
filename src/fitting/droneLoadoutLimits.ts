import type { HullBonus, ShipStatFlatAttribute } from "../gamedata/fittingDb";
import type { ShipProfile } from "../ships";

export interface DroneLoadoutLimits {
  readonly maxActiveDrones: number;
  readonly bandwidthLimit: number;
  readonly capacityLimit: number;
}

export function droneLoadoutLimits(profile: ShipProfile, hullBonuses: readonly HullBonus[]): DroneLoadoutLimits {
  return {
    maxActiveDrones: profile.maxActiveDrones,
    bandwidthLimit: profile.droneBandwidth + flatSum(hullBonuses, "droneBandwidthFlat"),
    capacityLimit: profile.droneCapacity + flatSum(hullBonuses, "droneCapacityFlat"),
  };
}

function flatSum(hullBonuses: readonly HullBonus[], attribute: ShipStatFlatAttribute): number {
  return hullBonuses.reduce((sum, bonus) => (bonus.attribute === attribute ? sum + bonus.magnitude : sum), 0);
}
