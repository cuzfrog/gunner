import { DroneCatalogImpl } from "./droneCatalog";
import type { DroneStats } from "../gamedata/fittingDb";
import { toTypeId } from "../gamedata/ids";

function drone(overrides: Partial<DroneStats> = {}): DroneStats {
  return {
    sizeClass: "light",
    damageMultiplier: 1.92,
    emDamage: 0,
    thermalDamage: 20,
    kineticDamage: 0,
    explosiveDamage: 0,
    tracking: 2.178,
    sigResolution: 25,
    optimal: 1500,
    falloff: 500,
    maxVelocity: 3360,
    orbitSpeed: 4000,
    cycleTime: 4,
    bandwidth: 5,
    volume: 5,
    metaLevel: 5,
    metaGroupID: 2,
    id: toTypeId("2456"),
    name: "Hobgoblin II",
    ...overrides,
  };
}

function catalogWith(...drones: DroneStats[]): DroneCatalogImpl {
  const combatDrones: Record<string, DroneStats> = {};
  for (const d of drones) combatDrones[String(d.id)] = d;
  return new DroneCatalogImpl({ fittingDb: { combatDrones } });
}

describe("DroneCatalogImpl", () => {
  test("dronesByClass returns only drones of the requested class sorted by name", () => {
    const hobgoblin = drone({ name: "Hobgoblin II" });
    const warrior = drone({ id: toTypeId("2458"), name: "Warrior II" });
    const garde = drone({ id: toTypeId("28211"), name: "Garde II", sizeClass: "sentry", bandwidth: 25 });
    const catalog = catalogWith(hobgoblin, warrior, garde);
    const lightDrones = catalog.dronesByClass("light");
    expect(lightDrones).toHaveLength(2);
    expect(lightDrones[0].name).toBe("Hobgoblin II");
    expect(lightDrones[1].name).toBe("Warrior II");
    const sentryDrones = catalog.dronesByClass("sentry");
    expect(sentryDrones).toHaveLength(1);
    expect(sentryDrones[0].name).toBe("Garde II");
  });

  test("dronesByClass returns empty for class with no drones", () => {
    const catalog = catalogWith(drone());
    expect(catalog.dronesByClass("heavy")).toHaveLength(0);
  });

  test("usualForClass returns first drone by name", () => {
    const catalog = catalogWith(drone({ name: "Hobgoblin II" }), drone({ id: toTypeId("2458"), name: "Warrior II" }));
    expect(catalog.usualForClass("light")).toBe(toTypeId("2456"));
  });

  test("usualForClass returns undefined when no drones", () => {
    const catalog = catalogWith();
    expect(catalog.usualForClass("light")).toBeUndefined();
  });

  test("has returns true for known drone id", () => {
    const catalog = catalogWith(drone());
    expect(catalog.has(toTypeId("2456"))).toBe(true);
    expect(catalog.has(toTypeId("9999"))).toBe(false);
  });

  test("idForName returns id for known name", () => {
    const catalog = catalogWith(drone());
    expect(catalog.idForName("Hobgoblin II")).toBe(toTypeId("2456"));
    expect(catalog.idForName("Unknown")).toBeUndefined();
  });

  test("drone option damage is sum of all damage types", () => {
    const mixedDrone = drone({ emDamage: 10, thermalDamage: 10, kineticDamage: 10, explosiveDamage: 10, name: "Mixed" });
    const catalog = catalogWith(mixedDrone);
    const options = catalog.dronesByClass("light");
    expect(options[0].damage).toBe(40);
    expect(options[0].damageByType.em).toBe(10);
    expect(options[0].damageByType.thermal).toBe(10);
    expect(options[0].damageByType.kinetic).toBe(10);
    expect(options[0].damageByType.explosive).toBe(10);
  });
});
