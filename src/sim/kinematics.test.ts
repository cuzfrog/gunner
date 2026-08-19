import { vec } from "../math";
import { KinematicsImpl } from "./kinematics";
import type { ShipState } from "./types";

const kinematics = new KinematicsImpl();

const still: ShipState = {
  id: "attacker",
  position: vec(0, 0),
  velocity: vec(0, 0),
  maxSpeed: 0,
  mass: 1_200_000,
  inertiaModifier: 3,
  mode: "orbit",
  desiredRange: 5000,
  aggressivity: 1,
};

function ship(pos: [number, number], vel: [number, number]): ShipState {
  return {
    id: "target",
    position: vec(pos[0], pos[1]),
    velocity: vec(vel[0], vel[1]),
    maxSpeed: Math.hypot(vel[0], vel[1]),
    mass: 1_200_000,
    inertiaModifier: 3,
    mode: "orbit",
    desiredRange: 5000,
    aggressivity: 1,
  };
}

describe("KinematicsImpl", () => {
  test("is stationary when both ships are still", () => {
    const frame = kinematics.computeEngagement(still, still, 0);
    expect(frame.angularVelocity).toBe(0);
    expect(frame.distance).toBe(0);
  });

  test("angular = speed / range for a perfect orbit", () => {
    const frame = kinematics.computeEngagement(ship([0, 0], [0, 0]), ship([0, 5000], [1000, 0]), 0);
    expect(frame.distance).toBe(5000);
    expect(frame.angularVelocity).toBeCloseTo(1000 / 5000, 8);
    expect(frame.transversalSpeed).toBe(1000);
    expect(frame.radialVelocity).toBeCloseTo(0, 8);
  });

  test("radial approach has zero angular", () => {
    const frame = kinematics.computeEngagement(ship([0, 0], [0, 0]), ship([5000, 0], [-1000, 0]), 0);
    expect(frame.angularVelocity).toBeCloseTo(0, 8);
    expect(frame.radialVelocity).toBeCloseTo(-1000, 8);
  });
});
