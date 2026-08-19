import { len, vec } from "../math";
import type { Autopilot } from "./autopilot";
import { NaiveAutopilot } from "./autopilot";
import { KinematicsImpl } from "./kinematics";
import { PredictiveAutopilot } from "./predictiveAutopilot";
import type { OrbitDirection, ShipState } from "./types";

const kinematics = new KinematicsImpl();

function makeShip(
  id: "attacker" | "target",
  pos: [number, number],
  maxSpeed: number,
  mode: "orbit" | "keepAtRange",
  desiredRange: number,
  mass = 1,
  inertiaModifier = 1e-6,
  orbitDirection: OrbitDirection = "cw",
): ShipState {
  return {
    id,
    position: vec(pos[0], pos[1]),
    velocity: vec(0, 0),
    maxSpeed,
    mass,
    inertiaModifier,
    mode,
    desiredRange,
    orbitDirection,
  };
}

function makePredictive(targetSteering: Autopilot): PredictiveAutopilot {
  return new PredictiveAutopilot({ targetSteering, kinematics });
}

describe("PredictiveAutopilot", () => {
  test("cancels the opponent's transverse motion", () => {
    const targetSteering = vi.mocked<Autopilot>({ computeVelocity: vi.fn() });
    targetSteering.computeVelocity.mockReturnValue(vec(1000, 0));
    const autopilot = makePredictive(targetSteering);

    const attacker = makeShip("attacker", [0, 0], 1000, "keepAtRange", 5000);
    const target = makeShip("target", [0, 5000], 1000, "keepAtRange", 5000);
    const cmd = autopilot.computeVelocity(attacker, target, 0);

    expect(cmd.x).toBeGreaterThan(900);
    expect(Math.abs(cmd.y)).toBeLessThan(100);
    expect(len(cmd)).toBeLessThanOrEqual(1000 + 1e-9);
  });

  test("holds the command within the replan interval", () => {
    const targetSteering = vi.mocked<Autopilot>({ computeVelocity: vi.fn() });
    targetSteering.computeVelocity.mockReturnValue(vec(1000, 0));
    const spy = vi.spyOn(kinematics, "computeEngagement");

    const autopilot = makePredictive(targetSteering);
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
    const targetSteering = vi.mocked<Autopilot>({ computeVelocity: vi.fn() });
    targetSteering.computeVelocity.mockReturnValue(vec(1000, 0));
    const spy = vi.spyOn(kinematics, "computeEngagement");

    const autopilot = makePredictive(targetSteering);
    const attacker = makeShip("attacker", [0, 0], 1000, "keepAtRange", 5000);
    const target = makeShip("target", [0, 5000], 1000, "keepAtRange", 5000);

    autopilot.computeVelocity(attacker, target, 100);
    const afterFirstPlan = spy.mock.calls.length;

    autopilot.computeVelocity(attacker, target, 0);
    expect(spy.mock.calls.length).toBeGreaterThan(afterFirstPlan);
  });

  test("command never exceeds max speed", () => {
    const autopilot = makePredictive(new NaiveAutopilot());
    const attacker = makeShip("attacker", [0, 0], 300, "keepAtRange", 5000);
    const target = makeShip("target", [0, 5000], 300, "orbit", 5000);
    const cmd = autopilot.computeVelocity(attacker, target, 0);

    expect(len(cmd)).toBeLessThanOrEqual(300 + 1e-9);
  });

  test("steers toward desired range when transverse speed is already zero", () => {
    const targetSteering = vi.mocked<Autopilot>({ computeVelocity: vi.fn() });
    targetSteering.computeVelocity.mockReturnValue(vec(0, 0));
    const autopilot = makePredictive(targetSteering);

    const attacker = makeShip("attacker", [0, 0], 1000, "keepAtRange", 10000);
    const target = makeShip("target", [0, 14000], 0, "keepAtRange", 10000);
    const cmd = autopilot.computeVelocity(attacker, target, 0);

    expect(cmd.y).toBeGreaterThan(500);
    expect(Math.abs(cmd.x)).toBeLessThan(100);
  });
});
