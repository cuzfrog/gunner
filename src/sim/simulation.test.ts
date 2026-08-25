import { Vec2 } from "./vec2";
import { ReactiveAutopilot } from "./autopilot";
import type { Autopilot } from "./autopilot";
import type { EwarResolver } from "./ewarResolver";
import { EwarResolverImpl } from "./ewarResolver";
import { SimulationImpl } from "./simulation";
import { StackingPenaltyImpl } from "./stackingPenalty";
import type { CombatantConfig, EwarProjection, ShipConfig, SimConfig } from "./types";

const attackerSteering = vi.mocked<Autopilot>({ computeVelocity: vi.fn() });
const targetSteering = vi.mocked<Autopilot>({ computeVelocity: vi.fn() });
const ewarResolver: EwarResolver = { speedMultiplier: () => 1, disruptedTurret: (turret) => turret, propulsionSuppressed: () => false };

const scram: EwarProjection = {
  loadout: {
    webs: [],
    grapplers: [],
    disruptors: [],
    scramblers: [{ moduleName: "Warp Scrambler II", maxRange: 9000, overloadRangeBonusPercent: 20 }],
    scripts: [],
  },
  activation: {
    webs: [],
    grapplers: [],
    disruptors: [],
    scramblers: [{ active: true, overloaded: false }],
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
): ShipConfig {
  return { id, maxSpeed: 100, baseMaxSpeed, mass, inertiaModifier, mode, desiredRange: 5000, aggressivity: 1 };
}

function simConfig(attackerMode: ShipConfig["mode"], mass = INSTANT_MASS, inertiaModifier = INSTANT_INERTIA): SimConfig {
  return {
    attacker: shipConfig("attacker", attackerMode, mass, inertiaModifier),
    target: shipConfig("target", "orbit", mass, inertiaModifier),
    initialDistance: 5000,
  };
}

function makeSim(config: SimConfig): SimulationImpl {
  return new SimulationImpl({ attackerSteering, targetSteering, ewarResolver, simConfig: config });
}

describe("SimulationImpl", () => {
  beforeEach(() => {
    attackerSteering.computeVelocity.mockClear();
    attackerSteering.computeVelocity.mockImplementation(() => new Vec2(0, 0));
    targetSteering.computeVelocity.mockClear();
    targetSteering.computeVelocity.mockImplementation(() => new Vec2(100, 0));
  });

  test("step integrates positions by command * dt and advances time with instant dynamics", () => {
    const sim = makeSim(simConfig("keepAtRange"));
    sim.step(2);
    const snapshot = sim.snapshot();
    expect(snapshot.time).toBe(2);
    expect(snapshot.target.position.x).toBeCloseTo(200, 6);
    expect(snapshot.target.position.y).toBeCloseTo(5000, 6);
    expect(snapshot.attacker.position).toEqual(new Vec2(0, 0));
    expect(snapshot.attacker.velocity).toEqual(new Vec2(0, 0));
    expect(snapshot.target.velocity).toEqual(new Vec2(100, 0));
  });

  test("step integrates with dynamics lag", () => {
    const sim = makeSim(simConfig("keepAtRange", 2_000_000, 1));
    const tau = 2;
    const dt = 2;
    sim.step(dt);
    const snapshot = sim.snapshot();
    expect(snapshot.attacker.velocity.x).toBeCloseTo(0, 10);
    expect(snapshot.target.velocity.x).toBeCloseTo(100 * (1 - Math.exp(-dt / tau)), 6);
  });

  test("snapshot exposes actual velocity, not commanded", () => {
    const sim = makeSim(simConfig("keepAtRange", 2_000_000, 1));
    sim.step(0.1);
    const snapshot = sim.snapshot();
    expect(snapshot.target.velocity.len()).toBeLessThan(100);
    expect(snapshot.target.velocity.len()).toBeGreaterThan(0);
  });

  test("snapshot exposes the commanded velocities produced for the current states", () => {
    const sim = makeSim(simConfig("keepAtRange"));
    expect(sim.snapshot().commands).toEqual({ attacker: new Vec2(0, 0), target: new Vec2(100, 0) });
  });

  test("snapshot commands are recomputed from the configuration applied by update", () => {
    attackerSteering.computeVelocity.mockImplementation((ship) => new Vec2(ship.desiredRange, 0));
    const sim = makeSim(simConfig("keepAtRange"));
    sim.step(1);
    sim.update({
      ...simConfig("keepAtRange"),
      attacker: { ...shipConfig("attacker", "keepAtRange"), desiredRange: 3000 },
    });
    expect(sim.snapshot().commands.attacker).toEqual(new Vec2(3000, 0));
  });

  test("reset restores time and initial positions", () => {
    const sim = makeSim(simConfig("keepAtRange"));
    sim.step(1);
    sim.reset(simConfig("keepAtRange"));
    const snapshot = sim.snapshot();
    expect(snapshot.time).toBe(0);
    expect(snapshot.target.position).toEqual(new Vec2(0, 5000));
    expect(snapshot.attacker.position).toEqual(new Vec2(0, 0));
  });

  test("update keeps time and reapplies parameters without resetting velocity", () => {
    attackerSteering.computeVelocity.mockImplementation(() => new Vec2(0, 100));
    const sim = makeSim(simConfig("orbit"));
    sim.step(2);
    const before = sim.snapshot();
    expect(before.attacker.velocity.len()).toBeGreaterThan(0);
    sim.update({ ...simConfig("keepAtRange"), attacker: shipConfig("attacker", "keepAtRange"), initialDistance: 3000 });
    const after = sim.snapshot();
    const beforeDistance = before.attacker.position.dist(before.target.position);
    expect(after.time).toBe(before.time);
    expect(after.attacker.mode).toBe("keepAtRange");
    expect(after.attacker.position).toEqual(before.attacker.position);
    expect(after.attacker.velocity).toEqual(before.attacker.velocity);
    expect(after.target.position).toEqual(before.target.position);
    expect(after.target.velocity).toEqual(before.target.velocity);
    expect(after.attacker.position.dist(after.target.position)).toBeCloseTo(beforeDistance, 6);
  });

  test("applies an active opponent web to reduce the ship's effective max speed", () => {
    const resolver: EwarResolver = {
      speedMultiplier: (projection, distance) => (distance <= 5000 ? 0.4 : 1),
      disruptedTurret: (turret) => turret,
      propulsionSuppressed: () => false,
    };
    const steering: Autopilot = { computeVelocity: (ship) => new Vec2(ship.maxSpeed, 0) };
    const config = simConfig("orbit");
    const sim = new SimulationImpl({ attackerSteering: steering, targetSteering: steering, ewarResolver: resolver, simConfig: config });
    sim.step(1);
    const snapshot = sim.snapshot();
    expect(snapshot.target.velocity.x).toBeCloseTo(40, 6);
  });

  test("snapshot exposes the target's effective max speed under an in-range web", () => {
    const resolver: EwarResolver = {
      speedMultiplier: (projection, distance) => projection?.loadout.webs.length ? (distance <= 5000 ? 0.4 : 1) : 1,
      disruptedTurret: (turret) => turret,
      propulsionSuppressed: () => false,
    };
    const steering: Autopilot = { computeVelocity: () => new Vec2(0, 0) };
    const attackerWeb: EwarProjection = {
      loadout: {
        webs: [{ moduleName: "Stasis Webifier II", maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 0 }],
        grapplers: [],
        disruptors: [],
        scramblers: [],
        scripts: [],
      },
      activation: { webs: [{ active: true, overloaded: false }], grapplers: [], disruptors: [], scramblers: [] },
    };
    const config = { ...simConfig("orbit"), attacker: { ...shipConfig("attacker", "midships"), ewar: attackerWeb } };
    const sim = new SimulationImpl({ attackerSteering: steering, targetSteering: steering, ewarResolver: resolver, simConfig: config });
    const snapshot = sim.snapshot();
    expect(snapshot.target.maxSpeed).toBeCloseTo(40, 6);
    expect(snapshot.attacker.maxSpeed).toBe(100);
  });

  test("snapshot swaps to base max speed while propulsion is suppressed", () => {
    const resolver: EwarResolver = {
      speedMultiplier: () => 1,
      disruptedTurret: (turret) => turret,
      propulsionSuppressed: () => true,
    };
    const steering: Autopilot = { computeVelocity: () => new Vec2(0, 0) };
    const config = {
      attacker: shipConfig("attacker", "midships"),
      target: { ...shipConfig("target", "midships"), baseMaxSpeed: 200, maxSpeed: 1000 },
      initialDistance: 5000,
    };
    const sim = new SimulationImpl({ attackerSteering: steering, targetSteering: steering, ewarResolver: resolver, simConfig: config });
    const snapshot = sim.snapshot();
    expect(snapshot.target.maxSpeed).toBe(200);
  });

  test("snapshot leaves max speed unchanged when the projection is out of range", () => {
    const resolver: EwarResolver = {
      speedMultiplier: (projection, distance) => (distance <= 5000 ? 0.4 : 1),
      disruptedTurret: (turret) => turret,
      propulsionSuppressed: () => false,
    };
    const steering: Autopilot = { computeVelocity: () => new Vec2(0, 0) };
    const config = { ...simConfig("orbit"), initialDistance: 5001 };
    const sim = new SimulationImpl({ attackerSteering: steering, targetSteering: steering, ewarResolver: resolver, simConfig: config });
    const snapshot = sim.snapshot();
    expect(snapshot.target.maxSpeed).toBe(100);
  });

  test("keeps trajectories unchanged when no ewar is projected", () => {
    const steering = new ReactiveAutopilot();
    const noEwarResolver = new EwarResolverImpl({ stackingPenalty: new StackingPenaltyImpl() });
    const baseline = new SimulationImpl({ attackerSteering: steering, targetSteering: steering, ewarResolver: noEwarResolver, simConfig: simConfig("orbit") });
    const comparison = new SimulationImpl({ attackerSteering: steering, targetSteering: steering, ewarResolver, simConfig: simConfig("orbit") });
    const dt = 0.25;
    for (let i = 0; i < 40; i++) {
      baseline.step(dt);
      comparison.step(dt);
      const baseSnap = baseline.snapshot();
      const compSnap = comparison.snapshot();
      expect(compSnap.attacker.position).toEqual(baseSnap.attacker.position);
      expect(compSnap.target.position).toEqual(baseSnap.target.position);
      expect(compSnap.attacker.velocity).toEqual(baseSnap.attacker.velocity);
      expect(compSnap.target.velocity).toEqual(baseSnap.target.velocity);
    }
  });

  test("target velocity recovers when it moves outside web range", () => {
    const web: EwarProjection = {
      loadout: {
        webs: [{ moduleName: "Stasis Webifier II", maxRange: 5000, speedFactor: 0.6, overloadRangeBonusPercent: 0 }],
        grapplers: [],
        disruptors: [],
        scramblers: [],
        scripts: [],
      },
      activation: { webs: [{ active: true, overloaded: false }], grapplers: [], disruptors: [], scramblers: [] },
    };
    const resolver = new EwarResolverImpl({ stackingPenalty: new StackingPenaltyImpl() });
    const attackerSteering: Autopilot = { computeVelocity: () => new Vec2(0, 0) };
    const targetSteering = new ReactiveAutopilot();
    const config: SimConfig = {
      attacker: { id: "attacker", maxSpeed: 0, baseMaxSpeed: 0, mass: 1, inertiaModifier: 1e-6, mode: "midships", desiredRange: 0, aggressivity: 1, ewar: web },
      target: { id: "target", maxSpeed: 100, baseMaxSpeed: 100, mass: 1, inertiaModifier: 1e-6, mode: "keepAtRange", desiredRange: 10000, aggressivity: 1 },
      initialDistance: 4000,
    };
    const sim = new SimulationImpl({ attackerSteering, targetSteering, ewarResolver: resolver, simConfig: config });

    sim.step(0.1);
    expect(sim.snapshot().target.velocity.len()).toBeCloseTo(40, 6);

    let lastDistance = 4000;
    for (let i = 0; i < 1000; i++) {
      sim.step(0.1);
      lastDistance = sim.snapshot().target.position.dist(sim.snapshot().attacker.position);
      if (lastDistance > 5000) {
        sim.step(0.1);
        break;
      }
    }
    expect(lastDistance).toBeGreaterThan(5000);
    expect(sim.snapshot().target.velocity.len()).toBeGreaterThan(99);
  });

  test("an active scrambler caps the target at its base speed while in range", () => {
    const resolver = new EwarResolverImpl({ stackingPenalty: new StackingPenaltyImpl() });
    const attackerSteering: Autopilot = { computeVelocity: () => new Vec2(0, 0) };
    const targetSteering: Autopilot = { computeVelocity: (ship) => new Vec2(ship.maxSpeed, 0) };
    const config: SimConfig = {
      attacker: { id: "attacker", maxSpeed: 0, baseMaxSpeed: 0, mass: 1, inertiaModifier: 1e-6, mode: "midships", desiredRange: 0, aggressivity: 1, ewar: scram },
      target: { id: "target", maxSpeed: 1200, baseMaxSpeed: 200, mass: 1, inertiaModifier: 1e-6, mode: "keepAtRange", desiredRange: 10000, aggressivity: 1 },
      initialDistance: 9000,
    };
    const sim = new SimulationImpl({ attackerSteering, targetSteering, ewarResolver: resolver, simConfig: config });

    sim.step(1);
    expect(sim.snapshot().target.velocity.x).toBeCloseTo(200, 6);

    sim.update({
      ...config,
      target: { ...config.target, maxSpeed: 1200, baseMaxSpeed: 200, ewar: scram },
      attacker: { ...config.attacker, maxSpeed: 0, baseMaxSpeed: 0, ewar: undefined },
      initialDistance: 9001,
    });
    sim.step(1);
    expect(sim.snapshot().target.velocity.x).toBeCloseTo(1200, 6);
  });

  test("target without baseMaxSpeed falls back to maxSpeed under scrambler suppression", () => {
    const target: CombatantConfig = {
      id: "target", maxSpeed: 1200, mass: 1, inertiaModifier: 1e-6,
      mode: "keepAtRange", desiredRange: 10000, aggressivity: 1, ewar: scram,
    };
    const config: SimConfig = {
      attacker: { id: "attacker", maxSpeed: 0, baseMaxSpeed: 0, mass: 1, inertiaModifier: 1e-6, mode: "midships", desiredRange: 0, aggressivity: 1, ewar: undefined },
      target,
      initialDistance: 9000,
    };
    const resolver = new EwarResolverImpl({ stackingPenalty: new StackingPenaltyImpl() });
    const attackerSteering: Autopilot = { computeVelocity: () => new Vec2(0, 0) };
    const targetSteering: Autopilot = { computeVelocity: (ship) => new Vec2(ship.maxSpeed, 0) };
    const sim = new SimulationImpl({ attackerSteering, targetSteering, ewarResolver: resolver, simConfig: config });
    sim.step(1);
    expect(sim.snapshot().target.velocity.x).toBeCloseTo(1200, 6);
  });

  test("computes attacker command before target command and passes the current time", () => {
    const order: string[] = [];
    attackerSteering.computeVelocity.mockImplementation((ship) => {
      order.push(ship.id);
      return new Vec2(0, 0);
    });
    targetSteering.computeVelocity.mockImplementation((ship) => {
      order.push(ship.id);
      return new Vec2(100, 0);
    });

    const sim = makeSim(simConfig("orbit"));
    sim.step(1);

    expect(order).toEqual(["attacker", "target"]);
    expect(attackerSteering.computeVelocity.mock.calls[0][2]).toBe(0);
    expect(targetSteering.computeVelocity.mock.calls[0][2]).toBe(0);
  });
});
