import { dist, len, vec } from "../math";
import type { Autopilot } from "./autopilot";
import { SimulationImpl } from "./simulation";
import type { ShipConfig, SimConfig } from "./types";

const autopilot = vi.mocked<Autopilot>({ computeVelocity: vi.fn() });

const INSTANT_MASS = 1;
const INSTANT_INERTIA = 1e-6;

function shipConfig(
  id: ShipConfig["id"],
  mode: ShipConfig["mode"],
  mass = INSTANT_MASS,
  inertiaModifier = INSTANT_INERTIA,
): ShipConfig {
  return { id, maxSpeed: 100, mass, inertiaModifier, mode, desiredRange: 5000 };
}

function simConfig(attackerMode: ShipConfig["mode"], mass = INSTANT_MASS, inertiaModifier = INSTANT_INERTIA): SimConfig {
  return {
    attacker: shipConfig("attacker", attackerMode, mass, inertiaModifier),
    target: shipConfig("target", "orbit", mass, inertiaModifier),
    initialDistance: 5000,
  };
}

function makeSim(config: SimConfig): SimulationImpl {
  return new SimulationImpl({ autopilot, simConfig: config });
}

describe("SimulationImpl", () => {
  beforeEach(() => {
    autopilot.computeVelocity.mockClear();
    autopilot.computeVelocity.mockImplementation((ship) => (ship.id === "target" ? vec(100, 0) : vec(0, 0)));
  });

  test("step integrates positions by command * dt and advances time with instant dynamics", () => {
    const sim = makeSim(simConfig("keepAtRange"));
    sim.step(2);
    const snapshot = sim.snapshot();
    expect(snapshot.time).toBe(2);
    expect(snapshot.target.position.x).toBeCloseTo(200, 6);
    expect(snapshot.target.position.y).toBeCloseTo(5000, 6);
    expect(snapshot.attacker.position).toEqual(vec(0, 0));
    expect(snapshot.attacker.velocity).toEqual(vec(0, 0));
    expect(snapshot.target.velocity).toEqual(vec(100, 0));
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
    expect(len(snapshot.target.velocity)).toBeLessThan(100);
    expect(len(snapshot.target.velocity)).toBeGreaterThan(0);
  });

  test("snapshot exposes the commanded velocities produced for the current states", () => {
    const sim = makeSim(simConfig("keepAtRange"));
    expect(sim.snapshot().commands).toEqual({ attacker: vec(0, 0), target: vec(100, 0) });
  });

  test("snapshot commands are recomputed from the configuration applied by update", () => {
    autopilot.computeVelocity.mockImplementation((ship) => vec(ship.desiredRange, 0));
    const sim = makeSim(simConfig("keepAtRange"));
    sim.step(1);
    sim.update({
      ...simConfig("keepAtRange"),
      attacker: { ...shipConfig("attacker", "keepAtRange"), desiredRange: 3000 },
    });
    expect(sim.snapshot().commands.attacker).toEqual(vec(3000, 0));
  });

  test("reset restores time and initial positions", () => {
    const sim = makeSim(simConfig("keepAtRange"));
    sim.step(1);
    sim.reset(simConfig("keepAtRange"));
    const snapshot = sim.snapshot();
    expect(snapshot.time).toBe(0);
    expect(snapshot.target.position).toEqual(vec(0, 5000));
    expect(snapshot.attacker.position).toEqual(vec(0, 0));
  });

  test("update keeps time and reapplies parameters without resetting velocity", () => {
    autopilot.computeVelocity.mockImplementation((ship) => (ship.id === "attacker" ? vec(0, 100) : vec(0, 0)));
    const sim = makeSim(simConfig("orbit"));
    sim.step(2);
    const before = sim.snapshot();
    expect(len(before.attacker.velocity)).toBeGreaterThan(0);
    sim.update({ ...simConfig("keepAtRange"), attacker: shipConfig("attacker", "keepAtRange"), initialDistance: 3000 });
    const after = sim.snapshot();
    expect(after.time).toBe(before.time);
    expect(after.attacker.mode).toBe("keepAtRange");
    expect(after.attacker.position).toEqual(before.attacker.position);
    expect(after.attacker.velocity).toEqual(before.attacker.velocity);
    expect(dist(after.attacker.position, after.target.position)).toBeCloseTo(3000, 6);
  });

  test("computes attacker command before target command", () => {
    const sim = makeSim(simConfig("orbit"));
    expect(autopilot.computeVelocity).not.toHaveBeenCalled();
    sim.step(1);
    expect(autopilot.computeVelocity.mock.calls.map(([ship]) => ship.id)).toEqual(["attacker", "target"]);
    expect(autopilot.computeVelocity.mock.calls[0][2]).toBe(0);
    expect(autopilot.computeVelocity.mock.calls[1][2]).toBe(0);
  });
});
