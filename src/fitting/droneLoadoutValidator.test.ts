import { DroneLoadoutValidatorImpl, type DroneLoadoutViolation, type DroneLoadoutValidation } from "./droneLoadoutValidator";
import type { DroneStats, FittingDb } from "../gamedata/fittingDb";
import type { ShipProfile } from "../ships";
import { toTypeId, type ShipId, type FactionId, type HullTypeId } from "../gamedata/ids";

function makeDroneStats(overrides: { id: string; bandwidth: number; volume: number }): DroneStats {
  return {
    sizeClass: "light",
    damageMultiplier: 1,
    emDamage: 0,
    thermalDamage: 10,
    kineticDamage: 0,
    explosiveDamage: 0,
    tracking: 1,
    sigResolution: 40,
    optimal: 1000,
    falloff: 500,
    maxVelocity: 6000,
    orbitSpeed: 1800,
    cycleTime: 4,
    bandwidth: overrides.bandwidth,
    volume: overrides.volume,
    metaLevel: 0,
    metaGroupID: 1,
    id: toTypeId(overrides.id),
    name: `Drone ${overrides.id}`,
  };
}

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
    droneBandwidth: overrides.droneBandwidth ?? 75,
    droneCapacity: overrides.droneCapacity ?? 75,
    maxActiveDrones: overrides.maxActiveDrones ?? 5,
  };
}

function makeDb(drones: Record<string, DroneStats>): Pick<FittingDb, "combatDrones"> {
  return { combatDrones: drones };
}

describe("DroneLoadoutValidatorImpl", () => {
  const lightDrone = makeDroneStats({ id: "24545", bandwidth: 5, volume: 5 });
  const mediumDrone = makeDroneStats({ id: "24546", bandwidth: 10, volume: 10 });
  const heavyDrone = makeDroneStats({ id: "24547", bandwidth: 25, volume: 25 });
  const db = makeDb({ "24545": lightDrone, "24546": mediumDrone, "24547": heavyDrone });
  const validator = new DroneLoadoutValidatorImpl({ fittingDb: db });

  test("validates an empty loadout as valid", () => {
    const result = validator.validate([], makeProfile({}));
    expect(result.valid).toBe(true);
    expect(result.totalCount).toBe(0);
    expect(result.totalBandwidth).toBe(0);
    expect(result.totalVolume).toBe(0);
    expect(result.violations).toEqual([]);
  });

  test("validates a loadout within all limits", () => {
    const result = validator.validate(
      [{ typeId: toTypeId("24545"), count: 3 }, { typeId: toTypeId("24546"), count: 2 }],
      makeProfile({ droneBandwidth: 35, droneCapacity: 35, maxActiveDrones: 5 }),
    );
    expect(result.valid).toBe(true);
    expect(result.totalCount).toBe(5);
    expect(result.totalBandwidth).toBe(35);
    expect(result.totalVolume).toBe(35);
    expect(result.violations).toEqual([]);
  });

  test("reports tooManyDrones when count exceeds maxActiveDrones", () => {
    const result = validator.validate(
      [{ typeId: toTypeId("24545"), count: 3 }, { typeId: toTypeId("24546"), count: 3 }],
      makeProfile({ maxActiveDrones: 5 }),
    );
    expect(result.valid).toBe(false);
    expect(result.totalCount).toBe(6);
    expect(result.violations).toContain("tooManyDrones" as DroneLoadoutViolation);
  });

  test("reports bandwidthExceeded when total bandwidth exceeds ship limit", () => {
    const result = validator.validate(
      [{ typeId: toTypeId("24547"), count: 4 }],
      makeProfile({ droneBandwidth: 75, maxActiveDrones: 5 }),
    );
    expect(result.valid).toBe(false);
    expect(result.totalBandwidth).toBe(100);
    expect(result.violations).toContain("bandwidthExceeded" as DroneLoadoutViolation);
  });

  test("reports bayCapacityExceeded when total volume exceeds ship capacity", () => {
    const result = validator.validate(
      [{ typeId: toTypeId("24547"), count: 4 }],
      makeProfile({ droneBandwidth: 200, droneCapacity: 50, maxActiveDrones: 5 }),
    );
    expect(result.valid).toBe(false);
    expect(result.totalVolume).toBe(100);
    expect(result.violations).toContain("bayCapacityExceeded" as DroneLoadoutViolation);
  });

  test("reports multiple violations simultaneously", () => {
    const result = validator.validate(
      [{ typeId: toTypeId("24547"), count: 6 }],
      makeProfile({ droneBandwidth: 50, droneCapacity: 50, maxActiveDrones: 5 }),
    );
    expect(result.valid).toBe(false);
    expect(result.violations).toEqual(["tooManyDrones", "bandwidthExceeded", "bayCapacityExceeded"]);
  });

  test("skips unknown drone typeIds without error", () => {
    const result = validator.validate(
      [{ typeId: toTypeId("99999"), count: 1 }],
      makeProfile({}),
    );
    expect(result.valid).toBe(true);
    expect(result.totalCount).toBe(1);
    expect(result.totalBandwidth).toBe(0);
    expect(result.totalVolume).toBe(0);
  });

  test("treats zero-limit ship as rejecting all drones", () => {
    const result = validator.validate(
      [{ typeId: toTypeId("24545"), count: 1 }],
      makeProfile({ droneBandwidth: 0, droneCapacity: 0, maxActiveDrones: 0 }),
    );
    expect(result.valid).toBe(false);
    expect(result.violations).toContain("tooManyDrones" as DroneLoadoutViolation);
    expect(result.violations).toContain("bandwidthExceeded" as DroneLoadoutViolation);
    expect(result.violations).toContain("bayCapacityExceeded" as DroneLoadoutViolation);
  });
});
