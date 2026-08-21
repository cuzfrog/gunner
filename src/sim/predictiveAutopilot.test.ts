import { Vec2 } from "./vec2";
import { ReactiveAutopilot, type Autopilot } from "./autopilot";
import { KinematicsImpl } from "./kinematics";
import { PredictiveAutopilot } from "./predictiveAutopilot";
import type { AutopilotMode, OrbitDirection, ShipState } from "./types";

const kinematics = new KinematicsImpl();

function makeShip(
  id: "attacker" | "target",
  pos: [number, number],
  maxSpeed: number,
  mode: AutopilotMode,
  desiredRange: number,
  mass = 1,
  inertiaModifier = 1e-6,
  orbitDirection: OrbitDirection = "cw",
): ShipState {
  return {
    id,
    position: new Vec2(pos[0], pos[1]),
    velocity: new Vec2(0, 0),
    maxSpeed,
    mass,
    inertiaModifier,
    mode,
    desiredRange,
    aggressivity: 1,
    orbitDirection,
  };
}

function makePredictive(reactiveSteering: Autopilot): PredictiveAutopilot {
  return new PredictiveAutopilot({ reactiveSteering, kinematics });
}

describe("PredictiveAutopilot", () => {
  test("cancels the opponent's transverse motion", () => {
    const reactiveSteering = vi.mocked<Autopilot>({ computeVelocity: vi.fn() });
    reactiveSteering.computeVelocity.mockReturnValue(new Vec2(1000, 0));
    const autopilot = makePredictive(reactiveSteering);

    const attacker = makeShip("attacker", [0, 0], 1000, "keepAtRange", 5000);
    const target = makeShip("target", [0, 5000], 1000, "keepAtRange", 5000);
    const cmd = autopilot.computeVelocity(attacker, target, 0);

    expect(cmd.x).toBeGreaterThan(900);
    expect(Math.abs(cmd.y)).toBeLessThan(100);
    expect(cmd.len()).toBeLessThanOrEqual(1000 + 1e-9);
  });

  test("holds the command within the replan interval", () => {
    const reactiveSteering = vi.mocked<Autopilot>({ computeVelocity: vi.fn() });
    reactiveSteering.computeVelocity.mockReturnValue(new Vec2(1000, 0));
    const spy = vi.spyOn(kinematics, "computeEngagement");

    const autopilot = makePredictive(reactiveSteering);
    const attacker = makeShip("attacker", [0, 0], 1000, "keepAtRange", 5000);
    const target = makeShip("target", [0, 5000], 1000, "keepAtRange", 5000);

    autopilot.computeVelocity(attacker, target, 0);
    const afterFirstPlan = spy.mock.calls.length;
    expect(afterFirstPlan).toBeGreaterThan(0);

    autopilot.computeVelocity(attacker, target, 1.9);
    expect(spy.mock.calls.length).toBe(afterFirstPlan);

    autopilot.computeVelocity(attacker, target, 2);
    expect(spy.mock.calls.length).toBeGreaterThan(afterFirstPlan);
  });

  test("replans after time regression", () => {
    const reactiveSteering = vi.mocked<Autopilot>({ computeVelocity: vi.fn() });
    reactiveSteering.computeVelocity.mockReturnValue(new Vec2(1000, 0));
    const spy = vi.spyOn(kinematics, "computeEngagement");

    const autopilot = makePredictive(reactiveSteering);
    const attacker = makeShip("attacker", [0, 0], 1000, "keepAtRange", 5000);
    const target = makeShip("target", [0, 5000], 1000, "keepAtRange", 5000);

    autopilot.computeVelocity(attacker, target, 100);
    const afterFirstPlan = spy.mock.calls.length;

    autopilot.computeVelocity(attacker, target, 0);
    expect(spy.mock.calls.length).toBeGreaterThan(afterFirstPlan);
  });

  test("replans when ship configuration changes", () => {
    const reactiveSteering = vi.mocked<Autopilot>({ computeVelocity: vi.fn() });
    reactiveSteering.computeVelocity.mockReturnValue(new Vec2(1000, 0));
    const spy = vi.spyOn(kinematics, "computeEngagement");

    const autopilot = makePredictive(reactiveSteering);
    const attacker = makeShip("attacker", [0, 0], 1000, "keepAtRange", 5000);
    const target = makeShip("target", [0, 5000], 1000, "keepAtRange", 5000);

    autopilot.computeVelocity(attacker, target, 0);
    const afterFirstPlan = spy.mock.calls.length;

    const changedAttacker = { ...attacker, desiredRange: 15000 };
    autopilot.computeVelocity(changedAttacker, target, 0.5);
    expect(spy.mock.calls.length).toBeGreaterThan(afterFirstPlan);
  });

  test("command after refinement stays within the max speed disk", () => {
    const autopilot = makePredictive(new ReactiveAutopilot());
    const attacker = makeShip("attacker", [0, 0], 300, "keepAtRange", 5000);
    const target = makeShip("target", [0, 5000], 300, "orbit", 5000);
    const cmd = autopilot.computeVelocity(attacker, target, 0);

    expect(cmd.len()).toBeLessThanOrEqual(300 + 1e-9);
  });

  test("replans when the attacker's aggressivity changes", () => {
    const reactiveSteering = vi.mocked<Autopilot>({ computeVelocity: vi.fn() });
    reactiveSteering.computeVelocity.mockReturnValue(new Vec2(0, 0));
    const spy = vi.spyOn(kinematics, "computeEngagement");

    const autopilot = makePredictive(reactiveSteering);
    const attacker = makeShip("attacker", [0, 0], 1000, "keepAtRange", 5000);
    const target = makeShip("target", [0, 5000], 1000, "keepAtRange", 5000);

    autopilot.computeVelocity(attacker, target, 0);
    const afterFirstPlan = spy.mock.calls.length;

    const changedAttacker = { ...attacker, aggressivity: 0.1 };
    autopilot.computeVelocity(changedAttacker, target, 0.5);
    expect(spy.mock.calls.length).toBeGreaterThan(afterFirstPlan);
  });

  test("steers toward desired range when transverse speed is already zero", () => {
    const reactiveSteering = vi.mocked<Autopilot>({ computeVelocity: vi.fn() });
    reactiveSteering.computeVelocity.mockReturnValue(new Vec2(0, 0));
    const autopilot = makePredictive(reactiveSteering);

    const attacker = makeShip("attacker", [0, 0], 1000, "keepAtRange", 10000);
    const target = makeShip("target", [0, 14000], 0, "keepAtRange", 10000);
    const cmd = autopilot.computeVelocity(attacker, target, 0);

    expect(cmd.y).toBeGreaterThan(500);
    expect(Math.abs(cmd.x)).toBeLessThan(100);
  });

  test("with a low aggressivity it closes on a far target even when transverse motion is absent", () => {
    const reactiveSteering = vi.mocked<Autopilot>({ computeVelocity: vi.fn() });
    reactiveSteering.computeVelocity.mockReturnValue(new Vec2(0, 0));
    const autopilot = makePredictive(reactiveSteering);

    const attacker = makeShip("attacker", [0, 0], 1000, "keepAtRange", 10000);
    const target = makeShip("target", [0, 14000], 0, "keepAtRange", 10000);
    const rangeFocusedAttacker = { ...attacker, aggressivity: 0.01 };
    const cmd = autopilot.computeVelocity(rangeFocusedAttacker, target, 0);

    expect(cmd.y).toBeGreaterThan(900);
    expect(Math.abs(cmd.x)).toBeLessThan(100);
  });

  test("attacker faster than a radially fleeing target chooses a command near max speed toward the target", () => {
    const reactiveSteering = vi.mocked<Autopilot>({ computeVelocity: vi.fn() });
    reactiveSteering.computeVelocity.mockReturnValue(new Vec2(0, 1000));
    const autopilot = makePredictive(reactiveSteering);

    const attacker = makeShip("attacker", [0, 0], 1400, "keepAtRange", 2000);
    const target = makeShip("target", [0, 5000], 1000, "keepAtRange", 2000);
    const cmd = autopilot.computeVelocity(attacker, target, 0);

    expect(cmd.y).toBeGreaterThan(1300);
    expect(Math.abs(cmd.x)).toBeLessThan(100);
    expect(cmd.len()).toBeLessThanOrEqual(1400 + 1e-9);
  });

  test("midships delegates to reactive steering and skips planning", () => {
    const reactiveSteering = vi.mocked<Autopilot>({ computeVelocity: vi.fn() });
    reactiveSteering.computeVelocity.mockReturnValue(new Vec2(100, 0));
    const spy = vi.spyOn(kinematics, "computeEngagement");

    const autopilot = makePredictive(reactiveSteering);
    const attacker = makeShip("attacker", [0, 0], 1000, "midships", 5000);
    const target = makeShip("target", [0, 5000], 1000, "orbit", 5000);
    const cmd = autopilot.computeVelocity(attacker, target, 0);

    expect(cmd).toEqual(new Vec2(100, 0));
    expect(reactiveSteering.computeVelocity).toHaveBeenCalledWith(attacker, target, 0);
    expect(spy).not.toHaveBeenCalled();

    autopilot.computeVelocity(attacker, target, 0.5);
    expect(reactiveSteering.computeVelocity).toHaveBeenCalledTimes(2);
    expect(spy).not.toHaveBeenCalled();
  });

});
