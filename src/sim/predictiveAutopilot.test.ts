import { Vec2 } from "./vec2";
import { ReactiveAutopilot, type Autopilot } from "./autopilot";
import { KinematicsImpl } from "./kinematics";
import { PredictiveAutopilot } from "./predictiveAutopilot";
import type { AutopilotMode, OrbitDirection, ShipState } from "./types";

const kinematics = new KinematicsImpl();

function makeShip(
  id: "shipA" | "shipB",
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

    const shipA = makeShip("shipA", [0, 0], 1000, "maneuver", 5000);
    const shipB = makeShip("shipB", [0, 5000], 1000, "maneuver", 5000);
    const cmd = autopilot.computeVelocity(shipA, shipB, 0);

    expect(cmd.x).toBeGreaterThan(900);
    expect(Math.abs(cmd.y)).toBeLessThan(100);
    expect(cmd.len()).toBeLessThanOrEqual(1000 + 1e-9);
  });

  test("holds the command within the replan interval", () => {
    const reactiveSteering = vi.mocked<Autopilot>({ computeVelocity: vi.fn() });
    reactiveSteering.computeVelocity.mockReturnValue(new Vec2(1000, 0));
    const spy = vi.spyOn(kinematics, "computeEngagement");

    const autopilot = makePredictive(reactiveSteering);
    const shipA = makeShip("shipA", [0, 0], 1000, "maneuver", 5000);
    const shipB = makeShip("shipB", [0, 5000], 1000, "maneuver", 5000);

    autopilot.computeVelocity(shipA, shipB, 0);
    const afterFirstPlan = spy.mock.calls.length;
    expect(afterFirstPlan).toBeGreaterThan(0);

    autopilot.computeVelocity(shipA, shipB, 1.9);
    expect(spy.mock.calls.length).toBe(afterFirstPlan);

    autopilot.computeVelocity(shipA, shipB, 2);
    expect(spy.mock.calls.length).toBeGreaterThan(afterFirstPlan);
  });

  test("replans after time regression", () => {
    const reactiveSteering = vi.mocked<Autopilot>({ computeVelocity: vi.fn() });
    reactiveSteering.computeVelocity.mockReturnValue(new Vec2(1000, 0));
    const spy = vi.spyOn(kinematics, "computeEngagement");

    const autopilot = makePredictive(reactiveSteering);
    const shipA = makeShip("shipA", [0, 0], 1000, "maneuver", 5000);
    const shipB = makeShip("shipB", [0, 5000], 1000, "maneuver", 5000);

    autopilot.computeVelocity(shipA, shipB, 100);
    const afterFirstPlan = spy.mock.calls.length;

    autopilot.computeVelocity(shipA, shipB, 0);
    expect(spy.mock.calls.length).toBeGreaterThan(afterFirstPlan);
  });

  test("replans when ship configuration changes", () => {
    const reactiveSteering = vi.mocked<Autopilot>({ computeVelocity: vi.fn() });
    reactiveSteering.computeVelocity.mockReturnValue(new Vec2(1000, 0));
    const spy = vi.spyOn(kinematics, "computeEngagement");

    const autopilot = makePredictive(reactiveSteering);
    const shipA = makeShip("shipA", [0, 0], 1000, "maneuver", 5000);
    const shipB = makeShip("shipB", [0, 5000], 1000, "maneuver", 5000);

    autopilot.computeVelocity(shipA, shipB, 0);
    const afterFirstPlan = spy.mock.calls.length;

    const changedShipA = { ...shipA, desiredRange: 15000 };
    autopilot.computeVelocity(changedShipA, shipB, 0.5);
    expect(spy.mock.calls.length).toBeGreaterThan(afterFirstPlan);
  });

  test("command after refinement stays within the max speed disk", () => {
    const autopilot = makePredictive(new ReactiveAutopilot());
    const shipA = makeShip("shipA", [0, 0], 300, "maneuver", 5000);
    const shipB = makeShip("shipB", [0, 5000], 300, "orbit", 5000);
    const cmd = autopilot.computeVelocity(shipA, shipB, 0);

    expect(cmd.len()).toBeLessThanOrEqual(300 + 1e-9);
  });

  test("replans when the shipA's aggressivity changes", () => {
    const reactiveSteering = vi.mocked<Autopilot>({ computeVelocity: vi.fn() });
    reactiveSteering.computeVelocity.mockReturnValue(new Vec2(0, 0));
    const spy = vi.spyOn(kinematics, "computeEngagement");

    const autopilot = makePredictive(reactiveSteering);
    const shipA = makeShip("shipA", [0, 0], 1000, "maneuver", 5000);
    const shipB = makeShip("shipB", [0, 5000], 1000, "maneuver", 5000);

    autopilot.computeVelocity(shipA, shipB, 0);
    const afterFirstPlan = spy.mock.calls.length;

    const changedShipA = { ...shipA, aggressivity: 0.1 };
    autopilot.computeVelocity(changedShipA, shipB, 0.5);
    expect(spy.mock.calls.length).toBeGreaterThan(afterFirstPlan);
  });

  test("steers toward desired range when transverse speed is already zero", () => {
    const reactiveSteering = vi.mocked<Autopilot>({ computeVelocity: vi.fn() });
    reactiveSteering.computeVelocity.mockReturnValue(new Vec2(0, 0));
    const autopilot = makePredictive(reactiveSteering);

    const shipA = makeShip("shipA", [0, 0], 1000, "maneuver", 10000);
    const shipB = makeShip("shipB", [0, 14000], 0, "maneuver", 10000);
    const cmd = autopilot.computeVelocity(shipA, shipB, 0);

    expect(cmd.y).toBeGreaterThan(500);
    expect(Math.abs(cmd.x)).toBeLessThan(100);
  });

  test("with a low aggressivity it closes on a far shipB even when transverse motion is absent", () => {
    const reactiveSteering = vi.mocked<Autopilot>({ computeVelocity: vi.fn() });
    reactiveSteering.computeVelocity.mockReturnValue(new Vec2(0, 0));
    const autopilot = makePredictive(reactiveSteering);

    const shipA = makeShip("shipA", [0, 0], 1000, "maneuver", 10000);
    const shipB = makeShip("shipB", [0, 14000], 0, "maneuver", 10000);
    const rangeFocusedShipA = { ...shipA, aggressivity: 0.01 };
    const cmd = autopilot.computeVelocity(rangeFocusedShipA, shipB, 0);

    expect(cmd.y).toBeGreaterThan(900);
    expect(Math.abs(cmd.x)).toBeLessThan(100);
  });

  test("shipA faster than a radially fleeing shipB chooses a command near max speed toward the shipB", () => {
    const reactiveSteering = vi.mocked<Autopilot>({ computeVelocity: vi.fn() });
    reactiveSteering.computeVelocity.mockReturnValue(new Vec2(0, 1000));
    const autopilot = makePredictive(reactiveSteering);

    const shipA = makeShip("shipA", [0, 0], 1400, "maneuver", 2000);
    const shipB = makeShip("shipB", [0, 5000], 1000, "maneuver", 2000);
    const cmd = autopilot.computeVelocity(shipA, shipB, 0);

    expect(cmd.y).toBeGreaterThan(1300);
    expect(Math.abs(cmd.x)).toBeLessThan(100);
    expect(cmd.len()).toBeLessThanOrEqual(1400 + 1e-9);
  });

  test("non-maneuver modes delegate to reactive steering and skip planning", () => {
    const reactiveSteering = vi.mocked<Autopilot>({ computeVelocity: vi.fn() });
    reactiveSteering.computeVelocity.mockReturnValue(new Vec2(100, 0));
    const spy = vi.spyOn(kinematics, "computeEngagement");

    const autopilot = makePredictive(reactiveSteering);
    for (const mode of ["orbit", "keepAtRange", "midships"] as const) {
      reactiveSteering.computeVelocity.mockClear();
      spy.mockClear();

      const shipA = makeShip("shipA", [0, 0], 1000, mode, 5000);
      const shipB = makeShip("shipB", [0, 5000], 1000, "orbit", 5000);
      const cmd = autopilot.computeVelocity(shipA, shipB, 0);

      expect(cmd).toEqual(new Vec2(100, 0));
      expect(reactiveSteering.computeVelocity).toHaveBeenCalledWith(shipA, shipB, 0);
      expect(reactiveSteering.computeVelocity).toHaveBeenCalledTimes(1);
      expect(spy).not.toHaveBeenCalled();

      autopilot.computeVelocity(shipA, shipB, 0.5);
      expect(reactiveSteering.computeVelocity).toHaveBeenCalledTimes(2);
      expect(spy).not.toHaveBeenCalled();
    }
  });

});
