import { droneLoadoutLimits, type DroneLoadoutLimits } from "./droneLoadoutLimits";
import type { HullBonus } from "../gamedata/fittingDb";
import type { ShipProfile } from "../ships";
import { toTypeId, type ShipId, type FactionId, type HullTypeId } from "../gamedata/ids";

function makeProfile(overrides: { droneBandwidth?: number; droneCapacity?: number; maxActiveDrones?: number }): ShipProfile {
  return {
    id: "test" as ShipId,
    name: "Test",
    factionId: "test" as FactionId,
    hullTypeId: "25" as HullTypeId,
    mass: 1_000_000,
    inertiaModifier: 3,
    baseSpeed: 300,
    sigRadius: 35,
    scanResolution: 200,
    maxTargetingRange: 30000,
    maxLockedTargets: 4,
    sensorStrengths: { gravimetric: 11, ladar: 0, magnetometric: 0, radar: 0 },
    highSlots: 4,
    medSlots: 4,
    lowSlots: 4,
    rigSlots: 3,
    powerGrid: 1000,
    cpuOutput: 400,
    droneBandwidth: overrides.droneBandwidth ?? 75,
    droneCapacity: overrides.droneCapacity ?? 75,
    maxActiveDrones: overrides.maxActiveDrones ?? 5,
    fighterCapacity: 0,
    fighterTubes: 0,
    fighterLightSlots: 0,
    fighterHeavySlots: 0,
    fighterSupportSlots: 0,
    shieldHp: 0,
    shieldRechargeTime: 0,
    armorHp: 0,
    hullHp: 0,
    capacitorCapacity: 0,
    capacitorRechargeTime: 0,
    shieldResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
    armorResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
    hullResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
    bonuses: [],
  };
}

describe("droneLoadoutLimits", () => {
  test("exposes the hull limits", () => {
    const limits = droneLoadoutLimits(makeProfile({ droneBandwidth: 75, droneCapacity: 120, maxActiveDrones: 5 }), []);
    expect(limits).toEqual({ maxActiveDrones: 5, bandwidthLimit: 75, capacityLimit: 120 } as DroneLoadoutLimits);
  });

  test("extends bandwidth and capacity by flat hull bonuses", () => {
    const hullBonuses: readonly HullBonus[] = [
      { attribute: "droneBandwidthFlat", magnitude: 125, scalesWithHullSkill: false, sourceId: toTypeId("45606") },
      { attribute: "droneCapacityFlat", magnitude: 300, scalesWithHullSkill: false, sourceId: toTypeId("45606") },
      { attribute: "shieldHpFlat", magnitude: 500, scalesWithHullSkill: false, sourceId: toTypeId("45606") },
    ];
    const limits = droneLoadoutLimits(makeProfile({ droneBandwidth: 0, droneCapacity: 0 }), hullBonuses);
    expect(limits.bandwidthLimit).toBe(125);
    expect(limits.capacityLimit).toBe(300);
  });

  test("ignores unrelated hull bonuses", () => {
    const hullBonuses: readonly HullBonus[] = [{ attribute: "powerGridFlat", magnitude: 100, scalesWithHullSkill: false, sourceId: toTypeId("45606") }];
    const limits = droneLoadoutLimits(makeProfile({}), hullBonuses);
    expect(limits.bandwidthLimit).toBe(75);
    expect(limits.capacityLimit).toBe(75);
  });
});
