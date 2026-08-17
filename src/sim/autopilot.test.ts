import { describe, expect, it } from "bun:test";
import * as v from "../math/vec2.js";
import { computeVelocity } from "./autopilot.js";
import type { ShipState } from "./types.js";

function makeShip(
  id: "attacker" | "target",
  pos: [number, number],
  mode: ShipState["mode"],
  maxSpeed: number,
  desiredRange = 5000,
): ShipState {
  return {
    id,
    position: v.vec(pos[0], pos[1]),
    velocity: v.vec(0, 0),
    maxSpeed,
    mode,
    desiredRange,
    orbitDirection: "cw",
  };
}

describe("computeVelocity", () => {
  it("orbit points tangentially around the reference", () => {
    const ship = makeShip("target", [0, 5000], "orbit", 1000, 5000);
    const other = makeShip("attacker", [0, 0], "orbit", 0, 5000);
    const vel = computeVelocity(ship, other);
    expect(vel.x).toBeGreaterThan(0); // clockwise from top -> moving +x
    expect(Math.abs(vel.y)).toBeLessThan(50);
  });

  it("approach points directly at the reference", () => {
    const ship = makeShip("attacker", [0, 0], "approach", 1000, 0);
    const other = makeShip("target", [5000, 0], "orbit", 0, 5000);
    const vel = computeVelocity(ship, other);
    expect(vel.x).toBeCloseTo(1000, 5);
    expect(vel.y).toBeCloseTo(0, 5);
  });

  it("retreat points directly away from the reference", () => {
    const ship = makeShip("attacker", [0, 0], "retreat", 1000, 0);
    const other = makeShip("target", [5000, 0], "orbit", 0, 5000);
    const vel = computeVelocity(ship, other);
    expect(vel.x).toBeCloseTo(-1000, 5);
    expect(vel.y).toBeCloseTo(0, 5);
  });

  it("match copies the other ship's velocity", () => {
    const ship = makeShip("attacker", [0, 0], "match", 1000, 0);
    const other = makeShip("target", [5000, 0], "orbit", 0, 5000);
    other.velocity = v.vec(600, 800);
    const vel = computeVelocity(ship, other);
    expect(vel.x).toBeCloseTo(600, 5);
    expect(vel.y).toBeCloseTo(800, 5);
  });

  it("match caps at max speed", () => {
    const ship = makeShip("attacker", [0, 0], "match", 500, 0);
    const other = makeShip("target", [5000, 0], "orbit", 0, 5000);
    other.velocity = v.vec(1000, 0);
    const vel = computeVelocity(ship, other);
    expect(v.len(vel)).toBe(500);
  });
});
