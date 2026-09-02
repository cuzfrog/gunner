import { Vec2 } from "./vec2";
import { HitChanceImpl } from "./hitChance";
import { type EngagementFrame, type ShipState, type TurretSpec, ZERO_DAMAGE } from "./types";

const hitChance = new HitChanceImpl();

const defaultTurret: TurretSpec = {
  kind: "turret",
  tracking: 0.32,
  sigResolution: 40,
  optimal: 5000,
  falloff: 5000,
  damagePerShot: ZERO_DAMAGE,
  cycleTime: 1,
  turretCount: 1,
};

const dummyShip: ShipState = {
  id: "shipB",
  position: new Vec2(0, 0),
  velocity: new Vec2(0, 0),
  maxSpeed: 0,
  mass: 1_200_000,
  inertiaModifier: 3,
  mode: "orbit",
  desiredRange: 0,
  aggressivity: 1,
};

function frame(distance: number, angularVelocity: number): EngagementFrame {
  return {
    time: 0,
    shipA: dummyShip,
    shipB: dummyShip,
    relPosition: new Vec2(distance, 0),
    distance,
    relVelocity: new Vec2(0, 0),
    radialVelocity: 0,
    transversalVelocity: new Vec2(0, angularVelocity * distance),
    transversalSpeed: angularVelocity * distance,
    angularVelocity,
  };
}

describe("HitChanceImpl", () => {
  test("is 100% when angular and range are perfect", () => {
    const h = hitChance.compute(frame(5000, 0), defaultTurret, 40);
    expect(h.chance).toBeCloseTo(1, 10);
    expect(h.trackingTerm).toBe(0);
    expect(h.rangeTerm).toBe(0);
  });

  test("matches the example tracking-only case", () => {
    const turret: TurretSpec = { ...defaultTurret, optimal: 100000, falloff: 0 };
    const f = frame(5000, 1000 / 5000);
    const h = hitChance.compute(f, turret, 40);
    const ratio = (f.angularVelocity * 40000) / (320 * 40);
    const expected = 0.5 ** (ratio ** 2);
    expect(h.chance).toBeCloseTo(expected, 8);
  });

  test("is 0 beyond optimal when falloff is 0", () => {
    const turret: TurretSpec = { ...defaultTurret, optimal: 5000, falloff: 0 };
    const h = hitChance.compute(frame(6000, 0), turret, 40);
    expect(h.chance).toBe(0);
    expect(h.rangeTerm).toBe(Number.POSITIVE_INFINITY);
  });

  test("findBestDistance returns a distance beyond optimal when useful", () => {
    const turret: TurretSpec = { ...defaultTurret, optimal: 5000, falloff: 5000 };
    const d = hitChance.findBestDistance(1000, turret, 40);
    expect(d).toBeGreaterThan(5000);
  });

  test("findBestDistance returns optimal for zero falloff or speed", () => {
    const turret: TurretSpec = { ...defaultTurret, optimal: 5000, falloff: 0 };
    expect(hitChance.findBestDistance(1000, turret, 40)).toBe(5000);
    expect(hitChance.findBestDistance(0, { ...defaultTurret, falloff: 5000 }, 40)).toBe(5000);
  });
});
