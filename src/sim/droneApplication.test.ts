import { DroneApplicationImpl } from "./droneApplication";
import { HitChanceImpl } from "./hitChance";
import { Vec2 } from "./vec2";
import type { DroneRuntimeState, DroneSpec, EngagementFrame, ShipState } from "./types";

const shipA: ShipState = { id: "shipA", maxSpeed: 0, mass: 1_000_000, inertiaModifier: 1, mode: "orbit", desiredRange: 1000, aggressivity: 1, position: new Vec2(0, 0), velocity: new Vec2(0, 0) };
const shipB: ShipState = { id: "shipB", maxSpeed: 0, mass: 1_000_000, inertiaModifier: 1, mode: "orbit", desiredRange: 1000, aggressivity: 1, position: new Vec2(0, 5000), velocity: new Vec2(0, 0) };

function frame(distance: number, angularVelocity: number): EngagementFrame {
  return { time: 0, shipA, shipB, relPosition: new Vec2(0, distance), distance, relVelocity: new Vec2(0, 0), radialVelocity: 0, transversalVelocity: new Vec2(0, 0), transversalSpeed: 0, angularVelocity };
}

function lightDrone(overrides: Partial<DroneSpec> = {}): DroneSpec {
  return { kind: "drone" as const, tracking: 2.178, sigResolution: 25, optimal: 1500, falloff: 500, damagePerShot: 38.4, cycleTime: 4, droneCount: 5, maxVelocity: 3360, orbitSpeed: 4000, orbitRange: 1000, isSentry: false, controlRange: 60000, ...overrides };
}

function sentryDrone(overrides: Partial<DroneSpec> = {}): DroneSpec {
  return { kind: "drone" as const, tracking: 0.0336, sigResolution: 400, optimal: 18000, falloff: 30000, damagePerShot: 105.6, cycleTime: 4, droneCount: 5, maxVelocity: 0, orbitSpeed: 0, orbitRange: 0, isSentry: true, controlRange: 60000, ...overrides };
}

const hitChance = new HitChanceImpl();
const application = new DroneApplicationImpl({ hitChance });

describe("DroneApplicationImpl", () => {
  test("engaging drone at orbit slot uses orbit speed for angular velocity", () => {
    const drone = lightDrone();
    const result = application.compute(frame(5000, 0), drone, 40);
    expect(result.inWeaponRange).toBe(true);
    expect(result.inRange).toBe(true);
    const expectedAngularVelocity = drone.orbitSpeed / drone.orbitRange;
    const expectedHit = hitChance.compute(frame(drone.orbitRange, expectedAngularVelocity), drone, 40);
    expect(result.hit.chance).toBeCloseTo(expectedHit.chance, 10);
  });

  test("engaging drone with perfect tracking has high hit chance", () => {
    const drone = lightDrone({ tracking: 1000, orbitSpeed: 1 });
    const result = application.compute(frame(5000, 0), drone, 1000);
    expect(result.hit.chance).toBeCloseTo(1.0, 4);
    expect(result.application).toBeGreaterThan(1.0);
  });

  test("engaging drone with poor tracking has reduced hit chance", () => {
    const drone = lightDrone({ tracking: 0.001, orbitSpeed: 4000 });
    const result = application.compute(frame(5000, 0), drone, 25);
    expect(result.hit.chance).toBeLessThan(0.5);
    expect(result.application).toBeLessThan(1.0);
  });

  test("sentry drone uses frame distance and angular velocity", () => {
    const drone = sentryDrone();
    const testFrame = frame(15000, 0.01);
    const result = application.compute(testFrame, drone, 400);
    expect(result.inWeaponRange).toBe(true);
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

  describe("control range", () => {
    test("sentry out of control range has zero applied DPS", () => {
      const drone = sentryDrone({ controlRange: 10000 });
      const result = application.compute(frame(15000, 0), drone, 400);
      expect(result.inControlRange).toBe(false);
      expect(result.inRange).toBe(false);
      expect(result.appliedDps).toBe(0);
    });

    test("sentry in weapon range but out of control range has zero applied DPS (legacy path)", () => {
      const drone = sentryDrone({ controlRange: 10000, optimal: 20000, falloff: 10000 });
      const result = application.compute(frame(15000, 0), drone, 400);
      expect(result.inControlRange).toBe(false);
      expect(result.inRange).toBe(false);
      expect(result.appliedDps).toBe(0);
    });

    test("sentry in control range and weapon range applies damage", () => {
      const drone = sentryDrone({ controlRange: 60000 });
      const result = application.compute(frame(15000, 0), drone, 400);
      expect(result.inControlRange).toBe(true);
      expect(result.inRange).toBe(true);
      expect(result.appliedDps).toBeGreaterThan(0);
    });

    test("sentry with state uses state inControlRange", () => {
      const drone = sentryDrone({ controlRange: 10000 });
      const state: DroneRuntimeState = { mode: "engaging", positions: [new Vec2(0, 0)], distanceToTarget: 15000, distanceToSlot: 0, inControlRange: true };
      const result = application.compute(frame(15000, 0), drone, 400, state);
      expect(result.inControlRange).toBe(true);
      expect(result.inRange).toBe(true);
    });

    test("sentry with state out of control range has zero DPS", () => {
      const drone = sentryDrone({ controlRange: 60000 });
      const state: DroneRuntimeState = { mode: "engaging", positions: [new Vec2(0, 0)], distanceToTarget: 70000, distanceToSlot: 0, inControlRange: false };
      const result = application.compute(frame(70000, 0), drone, 400, state);
      expect(result.inControlRange).toBe(false);
      expect(result.inRange).toBe(false);
      expect(result.appliedDps).toBe(0);
    });
  });

  describe("stateful mobile drones", () => {
    test("idle drone has zero applied DPS", () => {
      const drone = lightDrone();
      const state: DroneRuntimeState = { mode: "idle", positions: [new Vec2(0, 0)], distanceToTarget: 50000, distanceToSlot: 0, inControlRange: true };
      const result = application.compute(frame(5000, 0), drone, 40, state);
      expect(result.mode).toBe("idle");
      expect(result.inRange).toBe(false);
      expect(result.appliedDps).toBe(0);
    });

    test("returning drone has zero applied DPS", () => {
      const drone = lightDrone();
      const state: DroneRuntimeState = { mode: "returning", positions: [new Vec2(1000, 0)], distanceToTarget: 49000, distanceToSlot: 0, inControlRange: false };
      const result = application.compute(frame(5000, 0), drone, 40, state);
      expect(result.mode).toBe("returning");
      expect(result.inRange).toBe(false);
      expect(result.appliedDps).toBe(0);
    });

    test("engaging drone at orbit slot in control range applies damage", () => {
      const drone = lightDrone();
      const state: DroneRuntimeState = { mode: "engaging", positions: [new Vec2(0, 1500)], distanceToTarget: 1500, distanceToSlot: 0, inControlRange: true };
      const result = application.compute(frame(5000, 0), drone, 40, state);
      expect(result.mode).toBe("engaging");
      expect(result.inRange).toBe(true);
      expect(result.appliedDps).toBeGreaterThan(0);
    });

    test("engaging drone out of control range reports mode but no range", () => {
      const drone = lightDrone();
      const state: DroneRuntimeState = { mode: "engaging", positions: [new Vec2(0, 1500)], distanceToTarget: 1500, distanceToSlot: 0, inControlRange: false };
      const result = application.compute(frame(5000, 0), drone, 40, state);
      expect(result.mode).toBe("engaging");
      expect(result.inControlRange).toBe(false);
      expect(result.inRange).toBe(false);
    });

    test("engaging drone within weapon range but far from slot applies damage with reduced angular velocity", () => {
      const drone = lightDrone({ orbitRange: 1000, orbitSpeed: 4000 });
      const state: DroneRuntimeState = { mode: "engaging", positions: [new Vec2(0, 1500)], distanceToTarget: 1500, distanceToSlot: 1000, inControlRange: true };
      const result = application.compute(frame(5000, 0), drone, 40, state);
      expect(result.mode).toBe("engaging");
      expect(result.inRange).toBe(true);
      expect(result.appliedDps).toBeGreaterThan(0);
      const slotState: DroneRuntimeState = { mode: "engaging", positions: [new Vec2(0, 1500)], distanceToTarget: 1500, distanceToSlot: 0, inControlRange: true };
      const slotResult = application.compute(frame(5000, 0), drone, 40, slotState);
      expect(result.hit.chance).toBeGreaterThan(slotResult.hit.chance);
    });

    test("engaging drone out of weapon range has zero applied DPS", () => {
      const drone = lightDrone({ optimal: 100, falloff: 50 });
      const state: DroneRuntimeState = { mode: "engaging", positions: [new Vec2(0, 1500)], distanceToTarget: 1500, distanceToSlot: 0, inControlRange: true };
      const result = application.compute(frame(5000, 0), drone, 40, state);
      expect(result.inWeaponRange).toBe(false);
      expect(result.inRange).toBe(false);
      expect(result.appliedDps).toBe(0);
    });

    test("chasing drone pulled into falloff by fast target has reduced DPS vs settled orbit", () => {
      const drone = lightDrone({ tracking: 100, optimal: 1000, falloff: 200, orbitRange: 1000, orbitSpeed: 100 });
      const settled: DroneRuntimeState = { mode: "engaging", positions: [new Vec2(0, 1000)], distanceToTarget: 1000, distanceToSlot: 0, inControlRange: true };
      const settledResult = application.compute(frame(5000, 0), drone, 40, settled);
      const chasing: DroneRuntimeState = { mode: "engaging", positions: [new Vec2(0, 1500)], distanceToTarget: 1500, distanceToSlot: 1000, inControlRange: true };
      const chasingResult = application.compute(frame(5000, 0), drone, 40, chasing);
      expect(chasingResult.inRange).toBe(true);
      expect(chasingResult.appliedDps).toBeGreaterThan(0);
      expect(chasingResult.appliedDps).toBeLessThan(settledResult.appliedDps);
    });

    test("legacy path without state applies damage as before", () => {
      const drone = lightDrone();
      const result = application.compute(frame(5000, 0), drone, 40);
      expect(result.mode).toBe("engaging");
      expect(result.inControlRange).toBe(true);
      expect(result.inRange).toBe(true);
      expect(result.appliedDps).toBeGreaterThan(0);
    });
  });
});
