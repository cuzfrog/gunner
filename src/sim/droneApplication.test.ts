import { DroneApplicationImpl } from "./droneApplication";
import { HitChanceImpl } from "./hitChance";
import { Vec2 } from "./vec2";
import type { DroneSpec, EngagementFrame, ShipState } from "./types";

const shipA: ShipState = { id: "shipA", maxSpeed: 0, mass: 1_000_000, inertiaModifier: 1, mode: "orbit", desiredRange: 1000, aggressivity: 1, position: new Vec2(0, 0), velocity: new Vec2(0, 0) };
const shipB: ShipState = { id: "shipB", maxSpeed: 0, mass: 1_000_000, inertiaModifier: 1, mode: "orbit", desiredRange: 1000, aggressivity: 1, position: new Vec2(0, 5000), velocity: new Vec2(0, 0) };

function frame(distance: number, angularVelocity: number): EngagementFrame {
  return { time: 0, shipA, shipB, relPosition: new Vec2(0, distance), distance, relVelocity: new Vec2(0, 0), radialVelocity: 0, transversalVelocity: new Vec2(0, 0), transversalSpeed: 0, angularVelocity };
}

function lightDrone(overrides: Partial<DroneSpec> = {}): DroneSpec {
  return { kind: "drone", tracking: 2.178, sigResolution: 25, optimal: 1500, falloff: 500, damagePerShot: 38.4, cycleTime: 4, droneCount: 5, maxVelocity: 3360, orbitSpeed: 4000, isSentry: false, controlRange: 60000, ...overrides };
}

function sentryDrone(overrides: Partial<DroneSpec> = {}): DroneSpec {
  return { kind: "drone", tracking: 0.0336, sigResolution: 400, optimal: 18000, falloff: 30000, damagePerShot: 105.6, cycleTime: 4, droneCount: 5, maxVelocity: 0, orbitSpeed: 0, isSentry: true, controlRange: 60000, ...overrides };
}

const hitChance = new HitChanceImpl();
const application = new DroneApplicationImpl({ hitChance });

describe("DroneApplicationImpl", () => {
  test("orbiting drone uses orbit speed for angular velocity at optimal range", () => {
    const drone = lightDrone();
    const result = application.compute(frame(5000, 0), drone, 40);
    expect(result.orbiting).toBe(true);
    expect(result.inRange).toBe(true);
    const expectedAngularVelocity = drone.orbitSpeed / drone.optimal;
    const expectedHit = hitChance.compute(frame(drone.optimal, expectedAngularVelocity), drone, 40);
    expect(result.hit.chance).toBeCloseTo(expectedHit.chance, 10);
  });

  test("orbiting drone with perfect tracking has high hit chance", () => {
    const drone = lightDrone({ tracking: 1000, orbitSpeed: 1 });
    const result = application.compute(frame(5000, 0), drone, 1000);
    expect(result.hit.chance).toBeCloseTo(1.0, 4);
    expect(result.application).toBeGreaterThan(1.0);
  });

  test("orbiting drone with poor tracking has reduced hit chance", () => {
    const drone = lightDrone({ tracking: 0.001, orbitSpeed: 4000 });
    const result = application.compute(frame(5000, 0), drone, 25);
    expect(result.hit.chance).toBeLessThan(0.5);
    expect(result.application).toBeLessThan(1.0);
  });

  test("sentry drone uses frame distance and angular velocity", () => {
    const drone = sentryDrone();
    const testFrame = frame(15000, 0.01);
    const result = application.compute(testFrame, drone, 400);
    expect(result.orbiting).toBe(false);
    expect(result.inRange).toBe(true);
    const expectedHit = hitChance.compute(testFrame, drone, 400);
    expect(result.hit.chance).toBeCloseTo(expectedHit.chance, 10);
  });

  test("sentry drone out of range has zero applied DPS", () => {
    const drone = sentryDrone({ optimal: 1000, falloff: 500 });
    const result = application.compute(frame(5000, 0), drone, 400);
    expect(result.inRange).toBe(false);
    expect(result.appliedDps).toBe(0);
    expect(result.application).toBe(0);
  });

  test("sentry drone at extreme falloff has reduced hit chance", () => {
    const drone = sentryDrone({ optimal: 1000, falloff: 1000 });
    const result = application.compute(frame(3000, 0), drone, 400);
    expect(result.inRange).toBe(true);
    expect(result.hit.chance).toBeLessThan(0.5);
  });

  test("zero damage drone produces zero DPS", () => {
    const drone = lightDrone({ damagePerShot: 0 });
    const result = application.compute(frame(5000, 0), drone, 40);
    expect(result.nominalDps).toBe(0);
    expect(result.appliedDps).toBe(0);
    expect(result.volley).toBe(0);
  });

  test("zero cycle time drone produces zero DPS", () => {
    const drone = lightDrone({ cycleTime: 0 });
    const result = application.compute(frame(5000, 0), drone, 40);
    expect(result.nominalDps).toBe(0);
    expect(result.appliedDps).toBe(0);
  });

  test("nominal DPS is damagePerShot * droneCount / cycleTime", () => {
    const drone = lightDrone({ damagePerShot: 100, cycleTime: 5, droneCount: 3 });
    const result = application.compute(frame(5000, 0), drone, 40);
    expect(result.nominalDps).toBeCloseTo(60, 6);
    expect(result.volley).toBe(300);
  });

  test("zero chance produces zero applied DPS", () => {
    const drone = lightDrone({ tracking: 0, orbitSpeed: 4000, optimal: 100 });
    const result = application.compute(frame(5000, 0), drone, 25);
    expect(result.hit.chance).toBe(0);
    expect(result.appliedDps).toBe(0);
  });
});
