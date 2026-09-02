import { DroneLoadoutResolverImpl, type DroneLoadoutContext } from "./droneLoadoutResolver";
import type { FittingCalculator } from "./fittingCalculator";
import type { FittingState, DroneGroup } from "./fittingState";
import type { ImportedDrone } from "./droneCatalog";
import type { ShipProfile } from "../ships";
import type { StatConditions } from "../ships";
import type { HullBonus } from "../gamedata/fittingDb";
import { toTypeId, type ShipId, type FactionId, type HullTypeId } from "../gamedata/ids";

function makeProfile(): ShipProfile {
  return {
    id: "test" as ShipId,
    name: "Test",
    factionId: "test" as FactionId,
    hullTypeId: "25" as HullTypeId,
    mass: 1_000_000,
    inertiaModifier: 3,
    baseSpeed: 300,
    sigRadius: 35,
    droneBandwidth: 75,
    droneCapacity: 75,
    maxActiveDrones: 5,
    shieldHp: 0,
    shieldRechargeTime: 0,
    armorHp: 0,
    hullHp: 0,
    shieldResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
    armorResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
    hullResists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
  };
}

function makeConditions(): StatConditions {
  return { skillLevel: 5, overloaded: false, weaponOverloaded: false };
}

function makeContext(): DroneLoadoutContext {
  return { profile: makeProfile(), hullBonuses: [] as readonly HullBonus[], droneBoosterModules: [] };
}

function makeImportedDrone(typeId: string, count: number): ImportedDrone {
  return {
    typeId: toTypeId(typeId),
    name: `Drone ${typeId}`,
    sizeClass: "light",
    count,
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
    orbitRange: 1000,
    cycleTime: 4,
    bandwidth: 5,
    volume: 5,
    controlRange: 60000,
    damageBreakdown: { damageByType: { thermal: 10 }, factors: [] },
  };
}

function mockCalculator(): FittingCalculator {
  return {
    resolveTurrets: vi.fn(() => []),
    resolveLauncher: vi.fn(() => undefined),
    resolveHull: vi.fn(() => ({ fitted: { mass: 0, massMultiplier: 1, speedMultiplier: 1, inertiaMultiplier: 1, sigMultiplier: 1, sigRadiusAdd: 0 } })),
    resolvePropulsion: vi.fn(() => undefined),
    resolveEwar: vi.fn(() => ({ webs: [], grapplers: [], disruptors: [], painters: [], scramblers: [], scripts: [] })),
    resolveBoosts: vi.fn(() => ({ computers: [], scripts: [] })),
    resolveMissileBoosts: vi.fn(() => ({ computers: [], enhancers: [], scripts: [] })),
    resolveDrones: vi.fn((fitting: FittingState, _conditions: StatConditions): readonly ImportedDrone[] => {
      return fitting.droneGroups.map((g) => makeImportedDrone(String(g.typeId), g.count));
    }),
    resolveCargoCharges: vi.fn(() => []),
  };
}

describe("DroneLoadoutResolverImpl", () => {
  test("resolve returns ImportedDrone[] for the given groups", () => {
    const calculator = mockCalculator();
    const resolver = new DroneLoadoutResolverImpl({ fittingCalculator: calculator });

    const result = resolver.resolve(
      [{ typeId: toTypeId("24545"), count: 2 }, { typeId: toTypeId("24546"), count: 1 }],
      makeContext(),
      makeConditions(),
    );

    expect(result).toHaveLength(2);
    expect(result[0].count).toBe(2);
    expect(result[1].count).toBe(1);
    expect(calculator.resolveDrones).toHaveBeenCalledTimes(1);
  });

  test("resolve returns empty array for empty groups", () => {
    const calculator = mockCalculator();
    const resolver = new DroneLoadoutResolverImpl({ fittingCalculator: calculator });

    const result = resolver.resolve([], makeContext(), makeConditions());

    expect(result).toEqual([]);
    expect(calculator.resolveDrones).not.toHaveBeenCalled();
  });

  test("resolve passes the conditions to FittingCalculator", () => {
    const calculator = mockCalculator();
    const resolver = new DroneLoadoutResolverImpl({ fittingCalculator: calculator });
    const conditions = makeConditions();

    resolver.resolve([{ typeId: toTypeId("24545"), count: 1 }], makeContext(), conditions);

    const call = vi.mocked(calculator.resolveDrones).mock.calls[0];
    expect(call[1]).toBe(conditions);
  });

  test("resolve builds a fitting state with the user groups and captured context", () => {
    const calculator = mockCalculator();
    const resolver = new DroneLoadoutResolverImpl({ fittingCalculator: calculator });
    const context = makeContext();

    const userGroups: readonly DroneGroup[] = [{ typeId: toTypeId("24545"), count: 5 }];
    resolver.resolve(userGroups, context, makeConditions());

    const call = vi.mocked(calculator.resolveDrones).mock.calls[0];
    expect(call[0].droneGroups).toEqual(userGroups);
    expect(call[0].profile).toBe(context.profile);
    expect(call[0].hullBonuses).toBe(context.hullBonuses);
    expect(call[0].droneBoosterModules).toBe(context.droneBoosterModules);
  });
});
