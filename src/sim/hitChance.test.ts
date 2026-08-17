import { describe, expect, it } from "bun:test";
import * as v from "../math/vec2.js";
import { computeHitChance, findBestDistance } from "./hitChance.js";
import { computeEngagement } from "./kinematics.js";
import type { ShipState, TurretSpec } from "./types.js";

const defaultTurret: TurretSpec = {
  tracking: 0.32,
  sigResolution: 40,
  optimal: 5000,
  falloff: 5000,
};

function makeShip(
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

describe("computeHitChance", () => {
  it("is 100% when angular and range are perfect", () => {
    const attacker = makeShip([0, 0], [0, 0]);
    const target = makeShip([0, 5000], [0, 0]);
    const f = computeEngagement(attacker, target, 0);
    const h = computeHitChance(f, defaultTurret, 40);
    expect(h.chance).toBeCloseTo(1, 10);
    expect(h.trackingTerm).toBe(0);
    expect(h.rangeTerm).toBe(0);
  });

  it("matches the example tracking-only case", () => {
    const attacker = makeShip([0, 0], [0, 0]);
    const target = makeShip([0, 5000], [1000, 0]);
    const f = computeEngagement(attacker, target, 0);
    const turret: TurretSpec = { ...defaultTurret, optimal: 100000, falloff: 0 };
    const h = computeHitChance(f, turret, 40);
    const ratio = (f.angularVelocity * 40000) / (320 * 40);
    const expected = 0.5 ** (ratio ** 2);
    expect(h.chance).toBeCloseTo(expected, 8);
  });

  it("is 0 beyond optimal when falloff is 0", () => {
    const attacker = makeShip([0, 0], [0, 0]);
    const target = makeShip([0, 6000], [0, 0]);
    const f = computeEngagement(attacker, target, 0);
    const turret: TurretSpec = { ...defaultTurret, optimal: 5000, falloff: 0 };
    const h = computeHitChance(f, turret, 40);
    expect(h.chance).toBe(0);
    expect(h.rangeTerm).toBe(Number.POSITIVE_INFINITY);
  });

  it("findBestDistance returns a distance beyond optimal when useful", () => {
    const turret: TurretSpec = { ...defaultTurret, optimal: 5000, falloff: 5000 };
    const d = findBestDistance(1000, turret, 40);
    expect(d).toBeGreaterThan(5000);
  });

  it("findBestDistance returns optimal for zero falloff or speed", () => {
    const turret: TurretSpec = { ...defaultTurret, optimal: 5000, falloff: 0 };
    expect(findBestDistance(1000, turret, 40)).toBe(5000);
    expect(findBestDistance(0, { ...defaultTurret, falloff: 5000 }, 40)).toBe(5000);
  });
});
