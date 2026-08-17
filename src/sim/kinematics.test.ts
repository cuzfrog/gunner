import { describe, expect, it } from "bun:test";
import * as v from "../math/vec2.js";
import { computeEngagement } from "./kinematics.js";
import type { ShipState } from "./types.js";

const still: ShipState = {
  id: "attacker",
  position: v.vec(0, 0),
  velocity: v.vec(0, 0),
  maxSpeed: 0,
  mode: "orbit",
  desiredRange: 5000,
};

function ship(
  pos: [number, number],
  vel: [number, number],
): ShipState {
  return {
    id: "target",
    position: v.vec(pos[0], pos[1]),
    velocity: v.vec(vel[0], vel[1]),
    maxSpeed: v.len(v.vec(vel[0], vel[1])),
    mode: "orbit",
    desiredRange: 5000,
  };
}

describe("computeEngagement", () => {
  it("is stationary when both ships are still", () => {
    const f = computeEngagement(still, still, 0);
    expect(f.angularVelocity).toBe(0);
    expect(f.distance).toBe(0);
  });

  it("angular = speed / range for a perfect orbit", () => {
    const attacker = ship([0, 0], [0, 0]);
    const target = ship([0, 5000], [1000, 0]);
    const f = computeEngagement(attacker, target, 0);
    expect(f.distance).toBe(5000);
    expect(f.angularVelocity).toBeCloseTo(1000 / 5000, 8);
    expect(f.transversalSpeed).toBe(1000);
    expect(f.radialVelocity).toBeCloseTo(0, 8);
  });

  it("radial approach has zero angular", () => {
    const attacker = ship([0, 0], [0, 0]);
    const target = ship([5000, 0], [-1000, 0]);
    const f = computeEngagement(attacker, target, 0);
    expect(f.angularVelocity).toBeCloseTo(0, 8);
    expect(f.radialVelocity).toBeCloseTo(-1000, 8);
  });
});
