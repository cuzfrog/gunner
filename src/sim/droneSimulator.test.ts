import { Vec2 } from "./vec2";
import { DroneSimulatorImpl, _moveToward, _stepCombatDrone, _stepSentry } from "./droneSimulator";
import type { DroneMode, DroneSpec, EngagementFrame, ShipState } from "./types";

function lightDrone(overrides: Partial<DroneSpec> = {}): DroneSpec {
  return { kind: "drone", tracking: 2.178, sigResolution: 25, optimal: 1500, falloff: 500, damagePerShot: 38.4, cycleTime: 4, droneCount: 5, maxVelocity: 3000, orbitSpeed: 4000, isSentry: false, controlRange: 60000, ...overrides };
}

function sentryDrone(overrides: Partial<DroneSpec> = {}): DroneSpec {
  return { kind: "drone", tracking: 0.0336, sigResolution: 400, optimal: 18000, falloff: 30000, damagePerShot: 105.6, cycleTime: 4, droneCount: 5, maxVelocity: 0, orbitSpeed: 0, isSentry: true, controlRange: 60000, ...overrides };
}

function shipAt(x: number, y: number): ShipState {
  return { id: "shipA", maxSpeed: 0, mass: 1_000_000, inertiaModifier: 1, mode: "orbit", desiredRange: 1000, aggressivity: 1, position: new Vec2(x, y), velocity: new Vec2(0, 0) };
}

function frame(shipAPos: Vec2, shipBPos: Vec2, distance?: number): EngagementFrame {
  const dist = distance ?? shipAPos.dist(shipBPos);
  return { time: 0, shipA: shipAt(shipAPos.x, shipAPos.y), shipB: { ...shipAt(shipBPos.x, shipBPos.y), id: "shipB" }, relPosition: shipBPos.sub(shipAPos), distance: dist, relVelocity: new Vec2(0, 0), radialVelocity: 0, transversalVelocity: new Vec2(0, 0), transversalSpeed: 0, angularVelocity: 0 };
}

interface TestGroupState {
  readonly spec: DroneSpec;
  position: Vec2;
  mode: DroneMode;
  distanceToTarget: number;
  inControlRange: boolean;
}

function makeGroup(spec: DroneSpec, position: Vec2, mode: DroneMode): TestGroupState {
  return { spec, position, mode, distanceToTarget: 0, inControlRange: false };
}

describe("DroneSimulatorImpl", () => {
  test("reset places all drones at idle at origin", () => {
    const sim = new DroneSimulatorImpl();
    sim.reset({ shipA: [lightDrone()], shipB: [lightDrone(), lightDrone()] });
    const statesA = sim.states("shipA");
    expect(statesA).toHaveLength(1);
    expect(statesA[0].mode).toBe("idle");
    expect(statesA[0].position).toEqual(new Vec2(0, 0));
    const statesB = sim.states("shipB");
    expect(statesB).toHaveLength(2);
    expect(statesB[0].mode).toBe("idle");
    expect(statesB[1].mode).toBe("idle");
  });

  test("drones start at idle and produce zero applied state", () => {
    const sim = new DroneSimulatorImpl();
    sim.reset({ shipA: [lightDrone()], shipB: [] });
    const states = sim.states("shipA");
    expect(states[0].mode).toBe("idle");
    expect(states[0].inControlRange).toBe(false);
  });

  test("target within control range transitions idle to approaching", () => {
    const sim = new DroneSimulatorImpl();
    sim.reset({ shipA: [lightDrone()], shipB: [] });
    const shipPos = new Vec2(0, 0);
    const targetPos = new Vec2(50000, 0);
    sim.step(0.1, frame(shipPos, targetPos));
    const states = sim.states("shipA");
    expect(states[0].mode).toBe("approaching");
    expect(states[0].inControlRange).toBe(true);
  });

  test("target outside control range keeps drones idle", () => {
    const sim = new DroneSimulatorImpl();
    sim.reset({ shipA: [lightDrone({ controlRange: 40000 })], shipB: [] });
    const shipPos = new Vec2(0, 0);
    const targetPos = new Vec2(50000, 0);
    sim.step(0.1, frame(shipPos, targetPos));
    const states = sim.states("shipA");
    expect(states[0].mode).toBe("idle");
    expect(states[0].inControlRange).toBe(false);
  });

  test("drones travel toward target at maxVelocity", () => {
    const sim = new DroneSimulatorImpl();
    sim.reset({ shipA: [lightDrone({ maxVelocity: 3000, optimal: 1000 })], shipB: [] });
    const shipPos = new Vec2(0, 0);
    const targetPos = new Vec2(50000, 0);
    sim.step(1, frame(shipPos, targetPos));
    let states = sim.states("shipA");
    expect(states[0].mode).toBe("approaching");
    expect(states[0].position.x).toBeCloseTo(3000, 0);
    sim.step(1, frame(shipPos, targetPos));
    states = sim.states("shipA");
    expect(states[0].position.x).toBeCloseTo(6000, 0);
  });

  test("drones produce zero attack DPS before reaching target", () => {
    const sim = new DroneSimulatorImpl();
    sim.reset({ shipA: [lightDrone({ maxVelocity: 3000, optimal: 1000 })], shipB: [] });
    const shipPos = new Vec2(0, 0);
    const targetPos = new Vec2(50000, 0);
    sim.step(1, frame(shipPos, targetPos));
    const states = sim.states("shipA");
    expect(states[0].mode).toBe("approaching");
    expect(states[0].distanceToTarget).toBeGreaterThan(1000);
  });

  test("drones reach target and transition to orbiting", () => {
    const sim = new DroneSimulatorImpl();
    sim.reset({ shipA: [lightDrone({ maxVelocity: 50000, optimal: 1000 })], shipB: [] });
    const shipPos = new Vec2(0, 0);
    const targetPos = new Vec2(5000, 0);
    sim.step(0.1, frame(shipPos, targetPos));
    const states = sim.states("shipA");
    expect(states[0].mode).toBe("orbiting");
    expect(states[0].distanceToTarget).toBeLessThanOrEqual(1000);
  });

  test("target leaving control range causes drones to return", () => {
    const sim = new DroneSimulatorImpl();
    sim.reset({ shipA: [lightDrone({ maxVelocity: 1000, optimal: 1000, controlRange: 50000 })], shipB: [] });
    const shipPos = new Vec2(0, 0);
    const targetNear = new Vec2(3000, 0);
    sim.step(3, frame(shipPos, targetNear));
    expect(sim.states("shipA")[0].mode).toBe("orbiting");
    const targetFar = new Vec2(60000, 0);
    sim.step(0.1, frame(shipPos, targetFar));
    expect(sim.states("shipA")[0].mode).toBe("returning");
  });

  test("returning drones arrive at ship and become idle", () => {
    const sim = new DroneSimulatorImpl();
    sim.reset({ shipA: [lightDrone({ maxVelocity: 1000, optimal: 1000, controlRange: 50000 })], shipB: [] });
    const shipPos = new Vec2(0, 0);
    const targetNear = new Vec2(3000, 0);
    sim.step(3, frame(shipPos, targetNear));
    expect(sim.states("shipA")[0].mode).toBe("orbiting");
    const targetFar = new Vec2(60000, 0);
    sim.step(0.1, frame(shipPos, targetFar));
    expect(sim.states("shipA")[0].mode).toBe("returning");
    sim.step(5, frame(shipPos, targetFar));
    expect(sim.states("shipA")[0].mode).toBe("idle");
    expect(sim.states("shipA")[0].position).toEqual(shipPos);
  });

  test("each drone group tracks its own position independently", () => {
    const sim = new DroneSimulatorImpl();
    const drone1 = lightDrone({ maxVelocity: 3000, optimal: 1000 });
    const drone2 = lightDrone({ maxVelocity: 6000, optimal: 1000 });
    sim.reset({ shipA: [drone1, drone2], shipB: [] });
    const shipPos = new Vec2(0, 0);
    const targetPos = new Vec2(50000, 0);
    sim.step(1, frame(shipPos, targetPos));
    const states = sim.states("shipA");
    expect(states[0].position.x).toBeCloseTo(3000, 0);
    expect(states[1].position.x).toBeCloseTo(6000, 0);
  });

  test("sentry drones stay at ship position with orbiting mode", () => {
    const sim = new DroneSimulatorImpl();
    sim.reset({ shipA: [sentryDrone()], shipB: [] });
    const shipPos = new Vec2(1000, 2000);
    const targetPos = new Vec2(50000, 0);
    sim.step(0.1, frame(shipPos, targetPos));
    const states = sim.states("shipA");
    expect(states[0].mode).toBe("orbiting");
    expect(states[0].position).toEqual(shipPos);
  });

  test("sentry drones report inControlRange based on ship-to-target distance", () => {
    const sim = new DroneSimulatorImpl();
    sim.reset({ shipA: [sentryDrone({ controlRange: 40000 })], shipB: [] });
    const shipPos = new Vec2(0, 0);
    const targetFar = new Vec2(50000, 0);
    sim.step(0.1, frame(shipPos, targetFar));
    expect(sim.states("shipA")[0].inControlRange).toBe(false);
    const targetNear = new Vec2(30000, 0);
    sim.step(0.1, frame(shipPos, targetNear));
    expect(sim.states("shipA")[0].inControlRange).toBe(true);
  });

  test("shipB drones target shipA", () => {
    const sim = new DroneSimulatorImpl();
    sim.reset({ shipA: [], shipB: [lightDrone({ maxVelocity: 3000, optimal: 1000 })] });
    const shipAPos = new Vec2(0, 0);
    const shipBPos = new Vec2(50000, 0);
    sim.step(1, frame(shipAPos, shipBPos));
    const states = sim.states("shipB");
    expect(states[0].mode).toBe("approaching");
    expect(states[0].position.x).toBeCloseTo(47000, 0);
  });
});

describe("_moveToward", () => {
  test("moves position toward destination by speed*dt", () => {
    const group = makeGroup(lightDrone(), new Vec2(0, 0), "approaching");
    _moveToward(group, new Vec2(100, 0), 50, 1);
    expect(group.position.x).toBeCloseTo(50, 5);
    expect(group.position.y).toBeCloseTo(0, 5);
  });

  test("arrives at destination when step exceeds distance", () => {
    const group = makeGroup(lightDrone(), new Vec2(0, 0), "approaching");
    _moveToward(group, new Vec2(10, 0), 50, 1);
    expect(group.position).toEqual(new Vec2(10, 0));
  });

  test("does not move when speed is zero", () => {
    const group = makeGroup(lightDrone(), new Vec2(0, 0), "approaching");
    _moveToward(group, new Vec2(100, 0), 0, 1);
    expect(group.position).toEqual(new Vec2(0, 0));
  });
});

describe("_stepSentry", () => {
  test("places sentry at ship position with orbiting mode", () => {
    const group = makeGroup(sentryDrone(), new Vec2(0, 0), "idle");
    const shipPos = new Vec2(100, 200);
    const targetPos = new Vec2(50000, 0);
    _stepSentry(group, shipPos, targetPos, true);
    expect(group.mode).toBe("orbiting");
    expect(group.position).toEqual(shipPos);
    expect(group.distanceToTarget).toBeCloseTo(shipPos.dist(targetPos), 0);
  });
});

describe("_stepCombatDrone", () => {
  test("idle drone stays at ship when out of control range", () => {
    const group = makeGroup(lightDrone({ controlRange: 40000 }), new Vec2(0, 0), "idle");
    const shipPos = new Vec2(0, 0);
    const targetPos = new Vec2(50000, 0);
    _stepCombatDrone(group, shipPos, targetPos, false, 0.1);
    expect(group.mode).toBe("idle");
    expect(group.position).toEqual(shipPos);
  });
});
