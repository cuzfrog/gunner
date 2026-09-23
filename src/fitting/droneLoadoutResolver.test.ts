import { DroneLoadoutResolverImpl, type DroneLoadoutContext } from "./droneLoadoutResolver";
import type { FittingCalculator } from "./fittingCalculator";
import type { FittingState, DroneGroup } from "./fittingState";
import type { ImportedDrone } from "./droneCatalog";
import type { DroneStats, FittingDb, HullBonus } from "../gamedata/fittingDb";
import type { ShipProfile } from "../ships";
import type { StatConditions } from "../ships";
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

function makeConditions(): StatConditions {
  return { skillLevel: 5, overloaded: false, weaponOverloaded: false };
}

function makeContext(overrides: { profile?: ShipProfile; hullBonuses?: readonly HullBonus[] }): DroneLoadoutContext {
  return { profile: overrides.profile ?? makeProfile({}), hullBonuses: overrides.hullBonuses ?? [], droneBoosterModules: [] };
}

function makeDroneStats(id: string, bandwidth: number): DroneStats {
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
    orbitRange: 1000,
    cycleTime: 4,
    bandwidth,
    volume: bandwidth,
    metaLevel: 0,
    metaGroupID: 1,
    requiredSkillIds: [toTypeId("3436"), toTypeId("24241")],
    id: toTypeId(id),
    name: `Drone ${id}`,
  };
}

const LIGHT_ID = toTypeId("24545");
const MEDIUM_ID = toTypeId("24546");
const HEAVY_ID = toTypeId("24547");
const COMBAT_DRONES: Readonly<Record<string, DroneStats>> = {
  "24545": makeDroneStats("24545", 5),
  "24546": makeDroneStats("24546", 10),
  "24547": makeDroneStats("24547", 25),
};

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
    resolveVortons: vi.fn(() => []),
    resolveLauncher: vi.fn(() => undefined),
    resolveHull: vi.fn(() => ({ fitted: { mass: 0, massMultiplier: 1, speedMultiplier: 1, inertiaMultiplier: 1, sigMultiplier: 1, sigRadiusAdd: 0, mwdSigBloomMultiplier: 1 } })),
    resolvePropulsion: vi.fn(() => undefined),
    resolveEwar: vi.fn(() => ({ webs: [], grapplers: [], disruptors: [], painters: [], scramblers: [], dampeners: [], scripts: [], dampenerScripts: [], neutralizers: [], nosferatu: [], jammers: [], })),
    resolveBoosts: vi.fn(() => ({ computers: [], scripts: [] })),
    resolveMissileBoosts: vi.fn(() => ({ computers: [], enhancers: [], scripts: [] })),
    resolveSensorBoosts: vi.fn(() => ({ boosters: [], amplifiers: [], boosterScripts: [], dampenerScripts: [], neutralizers: [], nosferatu: [], jammers: [], })),
    resolveSensorSpec: vi.fn(() => ({ scanResolution: 0, maxTargetingRange: 0, maxLockedTargets: 0 })),
    resolveDrones: vi.fn((fitting: FittingState, _conditions: StatConditions): readonly ImportedDrone[] => {
      return fitting.droneGroups.map((g) => makeImportedDrone(String(g.typeId), g.count));
    }),
    resolveFighters: vi.fn(() => []),
    resolveCargoCharges: vi.fn(() => []),
    resolveEnergyWarfareResistance: vi.fn(() => 0),
  };
}

function makeResolver(calculator: FittingCalculator): DroneLoadoutResolverImpl {
  return new DroneLoadoutResolverImpl({ fittingCalculator: calculator, fittingDb: { combatDrones: COMBAT_DRONES } });
}

describe("DroneLoadoutResolverImpl", () => {
  test("resolve returns ImportedDrone[] for the given groups", () => {
    const calculator = mockCalculator();
    const resolver = makeResolver(calculator);

    const result = resolver.resolve(
      [{ typeId: LIGHT_ID, count: 2 }, { typeId: MEDIUM_ID, count: 1 }],
      makeContext({}),
      makeConditions(),
    );

    expect(result).toHaveLength(2);
    expect(result[0].count).toBe(2);
    expect(result[1].count).toBe(1);
    expect(calculator.resolveDrones).toHaveBeenCalledTimes(1);
  });

  test("resolve returns empty array for empty groups", () => {
    const calculator = mockCalculator();
    const resolver = makeResolver(calculator);

    const result = resolver.resolve([], makeContext({}), makeConditions());

    expect(result).toEqual([]);
    expect(calculator.resolveDrones).not.toHaveBeenCalled();
  });

  test("resolve passes the conditions to FittingCalculator", () => {
    const calculator = mockCalculator();
    const resolver = makeResolver(calculator);
    const conditions = makeConditions();

    resolver.resolve([{ typeId: LIGHT_ID, count: 1 }], makeContext({}), conditions);

    const call = vi.mocked(calculator.resolveDrones).mock.calls[0];
    expect(call[1]).toBe(conditions);
  });

  test("resolve builds a fitting state with the user groups and captured context", () => {
    const calculator = mockCalculator();
    const resolver = makeResolver(calculator);
    const context = makeContext({});

    const userGroups: readonly DroneGroup[] = [{ typeId: LIGHT_ID, count: 5 }];
    resolver.resolve(userGroups, context, makeConditions());

    const call = vi.mocked(calculator.resolveDrones).mock.calls[0];
    expect(call[0].droneGroups).toEqual(userGroups);
    expect(call[0].profile).toBe(context.profile);
    expect(call[0].hullBonuses).toBe(context.hullBonuses);
    expect(call[0].droneBoosterModules).toBe(context.droneBoosterModules);
  });

  test("launch count never exceeds the drone bandwidth limit", () => {
    const calculator = mockCalculator();
    const resolver = makeResolver(calculator);

    const result = resolver.resolve([{ typeId: HEAVY_ID, count: 5 }], makeContext({ profile: makeProfile({ droneBandwidth: 75 }) }), makeConditions());

    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(3);
  });

  test("launch count never exceeds maxActiveDrones", () => {
    const calculator = mockCalculator();
    const resolver = makeResolver(calculator);

    const result = resolver.resolve([{ typeId: LIGHT_ID, count: 10 }], makeContext({ profile: makeProfile({ maxActiveDrones: 5 }) }), makeConditions());

    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(5);
  });

  test("clamps groups in bay order and lets a smaller later group use leftover bandwidth", () => {
    const calculator = mockCalculator();
    const resolver = makeResolver(calculator);

    const result = resolver.resolve(
      [{ typeId: HEAVY_ID, count: 5 }, { typeId: LIGHT_ID, count: 5 }],
      makeContext({ profile: makeProfile({ droneBandwidth: 35, maxActiveDrones: 7 }) }),
      makeConditions(),
    );

    expect(result).toEqual([makeImportedDrone("24547", 1), makeImportedDrone("24545", 2)]);
  });

  test("a group that cannot launch is skipped and leaves the budget intact", () => {
    const calculator = mockCalculator();
    const resolver = makeResolver(calculator);

    const result = resolver.resolve(
      [{ typeId: HEAVY_ID, count: 2 }, { typeId: LIGHT_ID, count: 3 }],
      makeContext({ profile: makeProfile({ droneBandwidth: 20, maxActiveDrones: 5 }) }),
      makeConditions(),
    );

    expect(result).toEqual([makeImportedDrone("24545", 3)]);
  });

  test("drops drone types missing from the combat drone db", () => {
    const calculator = mockCalculator();
    const resolver = makeResolver(calculator);

    const result = resolver.resolve(
      [{ typeId: toTypeId("99999"), count: 3 }, { typeId: LIGHT_ID, count: 2 }],
      makeContext({}),
      makeConditions(),
    );

    expect(result).toEqual([makeImportedDrone("24545", 2)]);
  });

  test("resolves nothing when the hull has no drone bandwidth", () => {
    const calculator = mockCalculator();
    const resolver = makeResolver(calculator);

    const result = resolver.resolve([{ typeId: LIGHT_ID, count: 2 }], makeContext({ profile: makeProfile({ droneBandwidth: 0, maxActiveDrones: 0 }) }), makeConditions());

    expect(result).toEqual([]);
    expect(calculator.resolveDrones).not.toHaveBeenCalled();
  });

  test("flat hull bonuses extend the launch bandwidth budget", () => {
    const calculator = mockCalculator();
    const resolver = makeResolver(calculator);
    const hullBonuses: readonly HullBonus[] = [{ attribute: "droneBandwidthFlat", magnitude: 50, scalesWithHullSkill: false, sourceId: toTypeId("45606") }];

    const result = resolver.resolve([{ typeId: HEAVY_ID, count: 5 }], makeContext({ profile: makeProfile({ droneBandwidth: 75 }), hullBonuses }), makeConditions());

    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(5);
  });
});
