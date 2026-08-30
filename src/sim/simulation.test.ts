import { Vec2 } from "./vec2";
import { ReactiveAutopilot } from "./autopilot";
import type { Autopilot } from "./autopilot";
import type { EwarResolver } from "./ewarResolver";
import { EwarResolverImpl } from "./ewarResolver";
import { SimulationImpl } from "./simulation";
import { StackingPenaltyImpl } from "./stackingPenalty";
import { toTypeId } from "../gamedata/ids";
import type { CombatantConfig, EwarProjection, ShipConfig, SimConfig } from "./types";

const shipASteering = vi.mocked<Autopilot>({ computeVelocity: vi.fn() });
const shipBSteering = vi.mocked<Autopilot>({ computeVelocity: vi.fn() });
const ewarResolver: EwarResolver = { speedMultiplier: () => 1, speedMultiplierIgnoringRange: () => 1, sigMultiplier: () => 1, sigMultiplierIgnoringRange: () => 1, disruptedTurret: (turret) => turret, disruptedTurretIgnoringRange: (turret) => turret, propulsionSuppressed: () => false, propulsionSuppressedIgnoringRange: () => false, appliedEffects: () => [], speedBreakdown: () => ({ effects: [], propulsionSuppressed: false }), disruptionBreakdown: () => ({ tracking: [], optimal: [], falloff: [] }) };

const scram: EwarProjection = {
  loadout: {
    webs: [],
    grapplers: [],
    disruptors: [],
    scramblers: [{ moduleName: "Warp Scrambler II", moduleId: toTypeId("448"), maxRange: 9000, overloadRangeBonusPercent: 20 }],
    painters: [],
    scripts: [],
  },
  activation: {
    webs: [],
    grapplers: [],
    disruptors: [],
    scramblers: [{ active: true, overloaded: false }],
    painters: [],
  },
};

const INSTANT_MASS = 1;
const INSTANT_INERTIA = 1e-6;

function shipConfig(
  id: ShipConfig["id"],
  mode: ShipConfig["mode"],
  mass = INSTANT_MASS,
  inertiaModifier = INSTANT_INERTIA,
  baseMaxSpeed = 100,
  suppressedMaxSpeed?: number,
): ShipConfig {
  return {
    id, maxSpeed: 100, baseMaxSpeed, mass, inertiaModifier, mode, desiredRange: 5000, aggressivity: 1,
    ...(suppressedMaxSpeed !== undefined ? { suppressedMaxSpeed } : {}),
  };
}

function simConfig(shipAMode: ShipConfig["mode"], mass = INSTANT_MASS, inertiaModifier = INSTANT_INERTIA): SimConfig {
  return {
    shipA: shipConfig("shipA", shipAMode, mass, inertiaModifier),
    shipB: shipConfig("shipB", "orbit", mass, inertiaModifier),
    initialDistance: 5000,
  };
}

function makeSim(config: SimConfig): SimulationImpl {
  return new SimulationImpl({ shipASteering, shipBSteering, ewarResolver, simConfig: config });
}

describe("SimulationImpl", () => {
  beforeEach(() => {
    shipASteering.computeVelocity.mockClear();
    shipASteering.computeVelocity.mockImplementation(() => new Vec2(0, 0));
    shipBSteering.computeVelocity.mockClear();
    shipBSteering.computeVelocity.mockImplementation(() => new Vec2(100, 0));
  });

  test("step integrates positions by command * dt and advances time with instant dynamics", () => {
    const sim = makeSim(simConfig("keepAtRange"));
    sim.step(2);
    const snapshot = sim.snapshot();
    expect(snapshot.time).toBe(2);
    expect(snapshot.shipB.position.x).toBeCloseTo(200, 6);
    expect(snapshot.shipB.position.y).toBeCloseTo(5000, 6);
    expect(snapshot.shipA.position).toEqual(new Vec2(0, 0));
    expect(snapshot.shipA.velocity).toEqual(new Vec2(0, 0));
    expect(snapshot.shipB.velocity).toEqual(new Vec2(100, 0));
  });

  test("step integrates with dynamics lag", () => {
    const sim = makeSim(simConfig("keepAtRange", 2_000_000, 1));
    const tau = 2;
    const dt = 2;
    sim.step(dt);
    const snapshot = sim.snapshot();
    expect(snapshot.shipA.velocity.x).toBeCloseTo(0, 10);
    expect(snapshot.shipB.velocity.x).toBeCloseTo(100 * (1 - Math.exp(-dt / tau)), 6);
  });

  test("snapshot exposes actual velocity, not commanded", () => {
    const sim = makeSim(simConfig("keepAtRange", 2_000_000, 1));
    sim.step(0.1);
    const snapshot = sim.snapshot();
    expect(snapshot.shipB.velocity.len()).toBeLessThan(100);
    expect(snapshot.shipB.velocity.len()).toBeGreaterThan(0);
  });

  test("snapshot exposes the commanded velocities produced for the current states", () => {
    const sim = makeSim(simConfig("keepAtRange"));
    expect(sim.snapshot().commands).toEqual({ shipA: new Vec2(0, 0), shipB: new Vec2(100, 0) });
  });

  test("snapshot commands are recomputed from the configuration applied by update", () => {
    shipASteering.computeVelocity.mockImplementation((ship) => new Vec2(ship.desiredRange, 0));
    const sim = makeSim(simConfig("keepAtRange"));
    sim.step(1);
    sim.update({
      ...simConfig("keepAtRange"),
      shipA: { ...shipConfig("shipA", "keepAtRange"), desiredRange: 3000 },
    });
    expect(sim.snapshot().commands.shipA).toEqual(new Vec2(3000, 0));
  });

  test("reset restores time and initial positions", () => {
    const sim = makeSim(simConfig("keepAtRange"));
    sim.step(1);
    sim.reset(simConfig("keepAtRange"));
    const snapshot = sim.snapshot();
    expect(snapshot.time).toBe(0);
    expect(snapshot.shipB.position).toEqual(new Vec2(0, 5000));
    expect(snapshot.shipA.position).toEqual(new Vec2(0, 0));
  });

  test("update keeps time and reapplies parameters without resetting velocity", () => {
    shipASteering.computeVelocity.mockImplementation(() => new Vec2(0, 100));
    const sim = makeSim(simConfig("orbit"));
    sim.step(2);
    const before = sim.snapshot();
    expect(before.shipA.velocity.len()).toBeGreaterThan(0);
    sim.update({ ...simConfig("keepAtRange"), shipA: shipConfig("shipA", "keepAtRange"), initialDistance: 3000 });
    const after = sim.snapshot();
    const beforeDistance = before.shipA.position.dist(before.shipB.position);
    expect(after.time).toBe(before.time);
    expect(after.shipA.mode).toBe("keepAtRange");
    expect(after.shipA.position).toEqual(before.shipA.position);
    expect(after.shipA.velocity).toEqual(before.shipA.velocity);
    expect(after.shipB.position).toEqual(before.shipB.position);
    expect(after.shipB.velocity).toEqual(before.shipB.velocity);
    expect(after.shipA.position.dist(after.shipB.position)).toBeCloseTo(beforeDistance, 6);
  });

  test("applies an active opponent web to reduce the ship's effective max speed", () => {
    const resolver: EwarResolver = {
      speedMultiplier: (projection, distance) => (distance <= 5000 ? 0.4 : 1),
      speedMultiplierIgnoringRange: () => 1, sigMultiplier: () => 1, sigMultiplierIgnoringRange: () => 1, disruptedTurret: (turret) => turret,
      disruptedTurretIgnoringRange: (turret) => turret,
      propulsionSuppressed: () => false,
      propulsionSuppressedIgnoringRange: () => false,
      appliedEffects: () => [],
      speedBreakdown: () => ({ effects: [], propulsionSuppressed: false }),
      disruptionBreakdown: () => ({ tracking: [], optimal: [], falloff: [] }),
    };
    const steering: Autopilot = { computeVelocity: (ship) => new Vec2(ship.maxSpeed, 0) };
    const config = simConfig("orbit");
    const sim = new SimulationImpl({ shipASteering: steering, shipBSteering: steering, ewarResolver: resolver, simConfig: config });
    sim.step(1);
    const snapshot = sim.snapshot();
    expect(snapshot.shipB.velocity.x).toBeCloseTo(40, 6);
  });

  test("snapshot exposes the shipB's effective max speed under an in-range web", () => {
    const resolver: EwarResolver = {
      speedMultiplier: (projection, distance) => projection?.loadout.webs.length ? (distance <= 5000 ? 0.4 : 1) : 1,
      speedMultiplierIgnoringRange: () => 1, sigMultiplier: () => 1, sigMultiplierIgnoringRange: () => 1, disruptedTurret: (turret) => turret,
      disruptedTurretIgnoringRange: (turret) => turret,
      propulsionSuppressed: () => false,
      propulsionSuppressedIgnoringRange: () => false,
      appliedEffects: () => [],
      speedBreakdown: () => ({ effects: [], propulsionSuppressed: false }),
      disruptionBreakdown: () => ({ tracking: [], optimal: [], falloff: [] }),
    };
    const steering: Autopilot = { computeVelocity: () => new Vec2(0, 0) };
    const shipAWeb: EwarProjection = {
      loadout: {
        webs: [{ moduleName: "Stasis Webifier II", moduleId: toTypeId("527"), maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 0 }],
        grapplers: [],
        disruptors: [],
        scramblers: [],
        painters: [],
        scripts: [],
      },
      activation: { webs: [{ active: true, overloaded: false }], grapplers: [], disruptors: [], scramblers: []  , painters: [] },
    };
    const config = { ...simConfig("orbit"), shipA: { ...shipConfig("shipA", "midships"), ewar: shipAWeb } };
    const sim = new SimulationImpl({ shipASteering: steering, shipBSteering: steering, ewarResolver: resolver, simConfig: config });
    const snapshot = sim.snapshot();
    expect(snapshot.shipB.maxSpeed).toBeCloseTo(40, 6);
    expect(snapshot.shipA.maxSpeed).toBe(100);
  });

  test("snapshot swaps to base max speed while propulsion is suppressed", () => {
    const resolver: EwarResolver = {
      speedMultiplier: () => 1,
      speedMultiplierIgnoringRange: () => 1, sigMultiplier: () => 1, sigMultiplierIgnoringRange: () => 1, disruptedTurret: (turret) => turret,
      disruptedTurretIgnoringRange: (turret) => turret,
      propulsionSuppressed: () => true,
      propulsionSuppressedIgnoringRange: () => true,
      appliedEffects: () => [],
      speedBreakdown: () => ({ effects: [], propulsionSuppressed: false }),
      disruptionBreakdown: () => ({ tracking: [], optimal: [], falloff: [] }),
    };
    const steering: Autopilot = { computeVelocity: () => new Vec2(0, 0) };
    const config = {
      shipA: shipConfig("shipA", "midships"),
      shipB: { ...shipConfig("shipB", "midships"), baseMaxSpeed: 200, maxSpeed: 1000 },
      initialDistance: 5000,
    };
    const sim = new SimulationImpl({ shipASteering: steering, shipBSteering: steering, ewarResolver: resolver, simConfig: config });
    const snapshot = sim.snapshot();
    expect(snapshot.shipB.maxSpeed).toBe(200);
  });

  test("snapshot leaves max speed unchanged when the projection is out of range", () => {
    const resolver: EwarResolver = {
      speedMultiplier: (projection, distance) => (distance <= 5000 ? 0.4 : 1),
      speedMultiplierIgnoringRange: () => 1, sigMultiplier: () => 1, sigMultiplierIgnoringRange: () => 1, disruptedTurret: (turret) => turret,
      disruptedTurretIgnoringRange: (turret) => turret,
      propulsionSuppressed: () => false,
      propulsionSuppressedIgnoringRange: () => false,
      appliedEffects: () => [],
      speedBreakdown: () => ({ effects: [], propulsionSuppressed: false }),
      disruptionBreakdown: () => ({ tracking: [], optimal: [], falloff: [] }),
    };
    const steering: Autopilot = { computeVelocity: () => new Vec2(0, 0) };
    const config = { ...simConfig("orbit"), initialDistance: 5001 };
    const sim = new SimulationImpl({ shipASteering: steering, shipBSteering: steering, ewarResolver: resolver, simConfig: config });
    const snapshot = sim.snapshot();
    expect(snapshot.shipB.maxSpeed).toBe(100);
  });

  test("keeps trajectories unchanged when no ewar is projected", () => {
    const steering = new ReactiveAutopilot();
    const noEwarResolver = new EwarResolverImpl({ stackingPenalty: new StackingPenaltyImpl() });
    const baseline = new SimulationImpl({ shipASteering: steering, shipBSteering: steering, ewarResolver: noEwarResolver, simConfig: simConfig("orbit") });
    const comparison = new SimulationImpl({ shipASteering: steering, shipBSteering: steering, ewarResolver, simConfig: simConfig("orbit") });
    const dt = 0.25;
    for (let i = 0; i < 40; i++) {
      baseline.step(dt);
      comparison.step(dt);
      const baseSnap = baseline.snapshot();
      const compSnap = comparison.snapshot();
      expect(compSnap.shipA.position).toEqual(baseSnap.shipA.position);
      expect(compSnap.shipB.position).toEqual(baseSnap.shipB.position);
      expect(compSnap.shipA.velocity).toEqual(baseSnap.shipA.velocity);
      expect(compSnap.shipB.velocity).toEqual(baseSnap.shipB.velocity);
    }
  });

  test("shipB velocity recovers when it moves outside web range", () => {
    const web: EwarProjection = {
      loadout: {
        webs: [{ moduleName: "Stasis Webifier II", moduleId: toTypeId("527"), maxRange: 5000, speedFactor: 0.6, overloadRangeBonusPercent: 0 }],
        grapplers: [],
        disruptors: [],
        scramblers: [],
        painters: [],
        scripts: [],
      },
      activation: { webs: [{ active: true, overloaded: false }], grapplers: [], disruptors: [], scramblers: []  , painters: [] },
    };
    const resolver = new EwarResolverImpl({ stackingPenalty: new StackingPenaltyImpl() });
    const shipASteering: Autopilot = { computeVelocity: () => new Vec2(0, 0) };
    const shipBSteering = new ReactiveAutopilot();
    const config: SimConfig = {
      shipA: { id: "shipA", maxSpeed: 0, baseMaxSpeed: 0, mass: 1, inertiaModifier: 1e-6, mode: "midships", desiredRange: 0, aggressivity: 1, ewar: web },
      shipB: { id: "shipB", maxSpeed: 100, baseMaxSpeed: 100, mass: 1, inertiaModifier: 1e-6, mode: "keepAtRange", desiredRange: 10000, aggressivity: 1 },
      initialDistance: 4000,
    };
    const sim = new SimulationImpl({ shipASteering, shipBSteering, ewarResolver: resolver, simConfig: config });

    sim.step(0.1);
    expect(sim.snapshot().shipB.velocity.len()).toBeCloseTo(40, 6);

    let lastDistance = 4000;
    for (let i = 0; i < 1000; i++) {
      sim.step(0.1);
      lastDistance = sim.snapshot().shipB.position.dist(sim.snapshot().shipA.position);
      if (lastDistance > 5000) {
        sim.step(0.1);
        break;
      }
    }
    expect(lastDistance).toBeGreaterThan(5000);
    expect(sim.snapshot().shipB.velocity.len()).toBeGreaterThan(99);
  });

  test("an active scrambler caps the shipB at its base speed while in range", () => {
    const resolver = new EwarResolverImpl({ stackingPenalty: new StackingPenaltyImpl() });
    const shipASteering: Autopilot = { computeVelocity: () => new Vec2(0, 0) };
    const shipBSteering: Autopilot = { computeVelocity: (ship) => new Vec2(ship.maxSpeed, 0) };
    const config: SimConfig = {
      shipA: { id: "shipA", maxSpeed: 0, baseMaxSpeed: 0, mass: 1, inertiaModifier: 1e-6, mode: "midships", desiredRange: 0, aggressivity: 1, ewar: scram },
      shipB: { id: "shipB", maxSpeed: 1200, baseMaxSpeed: 200, mass: 1, inertiaModifier: 1e-6, mode: "keepAtRange", desiredRange: 10000, aggressivity: 1 },
      initialDistance: 9000,
    };
    const sim = new SimulationImpl({ shipASteering, shipBSteering, ewarResolver: resolver, simConfig: config });

    sim.step(1);
    expect(sim.snapshot().shipB.velocity.x).toBeCloseTo(200, 6);

    sim.update({
      ...config,
      shipB: { ...config.shipB, maxSpeed: 1200, baseMaxSpeed: 200, ewar: scram },
      shipA: { ...config.shipA, maxSpeed: 0, baseMaxSpeed: 0, ewar: undefined },
      initialDistance: 9001,
    });
    sim.step(1);
    expect(sim.snapshot().shipB.velocity.x).toBeCloseTo(1200, 6);
  });

  test("shipB without baseMaxSpeed falls back to maxSpeed under scrambler suppression", () => {
    const shipB: CombatantConfig = {
      id: "shipB", maxSpeed: 1200, mass: 1, inertiaModifier: 1e-6,
      mode: "keepAtRange", desiredRange: 10000, aggressivity: 1, ewar: scram,
    };
    const config: SimConfig = {
      shipA: { id: "shipA", maxSpeed: 0, baseMaxSpeed: 0, mass: 1, inertiaModifier: 1e-6, mode: "midships", desiredRange: 0, aggressivity: 1, ewar: undefined },
      shipB,
      initialDistance: 9000,
    };
    const resolver = new EwarResolverImpl({ stackingPenalty: new StackingPenaltyImpl() });
    const shipASteering: Autopilot = { computeVelocity: () => new Vec2(0, 0) };
    const shipBSteering: Autopilot = { computeVelocity: (ship) => new Vec2(ship.maxSpeed, 0) };
    const sim = new SimulationImpl({ shipASteering, shipBSteering, ewarResolver: resolver, simConfig: config });
    sim.step(1);
    expect(sim.snapshot().shipB.velocity.x).toBeCloseTo(1200, 6);
  });

  test("an active scrambler keeps an afterburner-boosted speed using suppressedMaxSpeed", () => {
    const resolver: EwarResolver = {
      speedMultiplier: () => 1,
      speedMultiplierIgnoringRange: () => 1, sigMultiplier: () => 1, sigMultiplierIgnoringRange: () => 1, disruptedTurret: (turret) => turret,
      disruptedTurretIgnoringRange: (turret) => turret,
      propulsionSuppressed: () => true,
      propulsionSuppressedIgnoringRange: () => true,
      appliedEffects: () => [],
      speedBreakdown: () => ({ effects: [], propulsionSuppressed: false }),
      disruptionBreakdown: () => ({ tracking: [], optimal: [], falloff: [] }),
    };
    const steering: Autopilot = { computeVelocity: (ship) => new Vec2(ship.maxSpeed, 0) };
    const config: SimConfig = {
      shipA: shipConfig("shipA", "midships"),
      shipB: { ...shipConfig("shipB", "midships", 1, 1e-6, 200, 1800), maxSpeed: 1800 },
      initialDistance: 5000,
    };
    const sim = new SimulationImpl({ shipASteering: steering, shipBSteering: steering, ewarResolver: resolver, simConfig: config });
    sim.step(1);
    expect(sim.snapshot().shipB.velocity.x).toBeCloseTo(1800, 6);
  });

  test("an active scrambler drops a microwarpdrive-boosted speed to suppressedMaxSpeed", () => {
    const resolver: EwarResolver = {
      speedMultiplier: () => 1,
      speedMultiplierIgnoringRange: () => 1, sigMultiplier: () => 1, sigMultiplierIgnoringRange: () => 1, disruptedTurret: (turret) => turret,
      disruptedTurretIgnoringRange: (turret) => turret,
      propulsionSuppressed: () => true,
      propulsionSuppressedIgnoringRange: () => true,
      appliedEffects: () => [],
      speedBreakdown: () => ({ effects: [], propulsionSuppressed: false }),
      disruptionBreakdown: () => ({ tracking: [], optimal: [], falloff: [] }),
    };
    const steering: Autopilot = { computeVelocity: (ship) => new Vec2(ship.maxSpeed, 0) };
    const config: SimConfig = {
      shipA: shipConfig("shipA", "midships"),
      shipB: { ...shipConfig("shipB", "midships", 1, 1e-6, 200, 200), maxSpeed: 1800 },
      initialDistance: 5000,
    };
    const sim = new SimulationImpl({ shipASteering: steering, shipBSteering: steering, ewarResolver: resolver, simConfig: config });
    sim.step(1);
    expect(sim.snapshot().shipB.velocity.x).toBeCloseTo(200, 6);
  });

  test("an active scrambler falls back to baseMaxSpeed when suppressedMaxSpeed is absent", () => {
    const resolver: EwarResolver = {
      speedMultiplier: () => 1,
      speedMultiplierIgnoringRange: () => 1, sigMultiplier: () => 1, sigMultiplierIgnoringRange: () => 1, disruptedTurret: (turret) => turret,
      disruptedTurretIgnoringRange: (turret) => turret,
      propulsionSuppressed: () => true,
      propulsionSuppressedIgnoringRange: () => true,
      appliedEffects: () => [],
      speedBreakdown: () => ({ effects: [], propulsionSuppressed: false }),
      disruptionBreakdown: () => ({ tracking: [], optimal: [], falloff: [] }),
    };
    const steering: Autopilot = { computeVelocity: (ship) => new Vec2(ship.maxSpeed, 0) };
    const config: SimConfig = {
      shipA: shipConfig("shipA", "midships"),
      shipB: { ...shipConfig("shipB", "midships", 1, 1e-6, 200), maxSpeed: 1800 },
      initialDistance: 5000,
    };
    const sim = new SimulationImpl({ shipASteering: steering, shipBSteering: steering, ewarResolver: resolver, simConfig: config });
    sim.step(1);
    expect(sim.snapshot().shipB.velocity.x).toBeCloseTo(200, 6);
  });

  test("computes shipA command before shipB command and passes the current time", () => {
    const order: string[] = [];
    shipASteering.computeVelocity.mockImplementation((ship) => {
      order.push(ship.id);
      return new Vec2(0, 0);
    });
    shipBSteering.computeVelocity.mockImplementation((ship) => {
      order.push(ship.id);
      return new Vec2(100, 0);
    });

    const sim = makeSim(simConfig("orbit"));
    sim.step(1);

    expect(order).toEqual(["shipA", "shipB"]);
    expect(shipASteering.computeVelocity.mock.calls[0][2]).toBe(0);
    expect(shipBSteering.computeVelocity.mock.calls[0][2]).toBe(0);
  });
});
