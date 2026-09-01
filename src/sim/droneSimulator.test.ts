import { Vec2 } from "./vec2";
import { DroneSimulatorImpl } from "./droneSimulator";
import type { DroneSpec, EngagementFrame, ShipState } from "./types";

function lightDrone(overrides: Partial<DroneSpec> = {}): DroneSpec {
  return { kind: "drone", tracking: 2.178, sigResolution: 25, optimal: 1500, falloff: 500, damagePerShot: 38.4, cycleTime: 4, droneCount: 5, maxVelocity: 3000, orbitSpeed: 4000, orbitRange: 1000, isSentry: false, controlRange: 60000, ...overrides };
}

function sentryDrone(overrides: Partial<DroneSpec> = {}): DroneSpec {
  return { kind: "drone", tracking: 0.0336, sigResolution: 400, optimal: 18000, falloff: 30000, damagePerShot: 105.6, cycleTime: 4, droneCount: 5, maxVelocity: 0, orbitSpeed: 0, orbitRange: 0, isSentry: true, controlRange: 60000, ...overrides };
}

function shipAt(x: number, y: number): ShipState {
  return { id: "shipA", maxSpeed: 0, mass: 1_000_000, inertiaModifier: 1, mode: "orbit", desiredRange: 1000, aggressivity: 1, position: new Vec2(x, y), velocity: new Vec2(0, 0) };
}

function frame(shipAPos: Vec2, shipBPos: Vec2, distance?: number): EngagementFrame {
  const dist = distance ?? shipAPos.dist(shipBPos);
  return { time: 0, shipA: shipAt(shipAPos.x, shipAPos.y), shipB: { ...shipAt(shipBPos.x, shipBPos.y), id: "shipB" }, relPosition: shipBPos.sub(shipAPos), distance: dist, relVelocity: new Vec2(0, 0), radialVelocity: 0, transversalVelocity: new Vec2(0, 0), transversalSpeed: 0, angularVelocity: 0 };
}

describe("DroneSimulatorImpl", () => {
  test("reset places all drones at idle at origin", () => {
    const sim = new DroneSimulatorImpl();
    sim.reset({ shipA: [lightDrone()], shipB: [lightDrone(), lightDrone()] });
    const statesA = sim.states("shipA");
    expect(statesA).toHaveLength(1);
    expect(statesA[0].mode).toBe("idle");
    expect(statesA[0].positions).toHaveLength(5);
    expect(statesA[0].positions[0]).toEqual(new Vec2(0, 0));
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

  test("drones deploy spread around ship at ~1000m", () => {
    const sim = new DroneSimulatorImpl();
    sim.reset({ shipA: [lightDrone({ maxVelocity: 3000, optimal: 1000, droneCount: 5 })], shipB: [] });
    const shipPos = new Vec2(0, 0);
    const targetPos = new Vec2(50000, 0);
    sim.step(0.001, frame(shipPos, targetPos));
    const states = sim.states("shipA");
    expect(states[0].mode).toBe("approaching");
    for (const pos of states[0].positions) {
      const dist = pos.dist(shipPos);
      expect(dist).toBeGreaterThan(900);
      expect(dist).toBeLessThan(1100);
    }
  });

  test("drones accelerate toward target with inertia", () => {
    const sim = new DroneSimulatorImpl();
    sim.reset({ shipA: [lightDrone({ maxVelocity: 3000, optimal: 1000, droneCount: 1 })], shipB: [] });
    const shipPos = new Vec2(0, 0);
    const targetPos = new Vec2(50000, 0);
    sim.step(0.001, frame(shipPos, targetPos));
    const afterDeploy = sim.states("shipA")[0].positions[0];
    sim.step(1, frame(shipPos, targetPos));
    const after1s = sim.states("shipA")[0].positions[0];
    const traveled = after1s.x - afterDeploy.x;
    expect(traveled).toBeGreaterThan(0);
    expect(traveled).toBeLessThan(3000);
    sim.step(1, frame(shipPos, targetPos));
    const after2s = sim.states("shipA")[0].positions[0];
    const traveled2 = after2s.x - after1s.x;
    expect(traveled2).toBeGreaterThan(traveled);
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
    sim.reset({ shipA: [lightDrone({ maxVelocity: 50000, optimal: 1000, orbitRange: 1000, droneCount: 1 })], shipB: [] });
    const shipPos = new Vec2(0, 0);
    const targetPos = new Vec2(5000, 0);
    for (let i = 0; i < 100; i++) sim.step(0.1, frame(shipPos, targetPos));
    const states = sim.states("shipA");
    expect(states[0].mode).toBe("orbiting");
    expect(states[0].distanceToTarget).toBeLessThan(3000);
  });

  test("orbiting drones circle the target, not stop", () => {
    const sim = new DroneSimulatorImpl();
    sim.reset({ shipA: [lightDrone({ maxVelocity: 50000, optimal: 1000, orbitRange: 1000, orbitSpeed: 1000, droneCount: 1 })], shipB: [] });
    const shipPos = new Vec2(0, 0);
    const targetPos = new Vec2(5000, 0);
    for (let i = 0; i < 30; i++) sim.step(0.1, frame(shipPos, targetPos));
    const states = sim.states("shipA");
    expect(states[0].mode).toBe("orbiting");
    const pos1 = states[0].positions[0];
    sim.step(0.5, frame(shipPos, targetPos));
    const pos2 = sim.states("shipA")[0].positions[0];
    const moved = pos1.dist(pos2);
    expect(moved).toBeGreaterThan(10);
  });

  test("orbiting drones spread around the target at different phases", () => {
    const sim = new DroneSimulatorImpl();
    sim.reset({ shipA: [lightDrone({ maxVelocity: 50000, optimal: 1500, orbitRange: 1000, orbitSpeed: 500, droneCount: 5 })], shipB: [] });
    const shipPos = new Vec2(0, 0);
    const targetPos = new Vec2(5000, 0);
    for (let i = 0; i < 200; i++) sim.step(0.1, frame(shipPos, targetPos));
    const states = sim.states("shipA");
    expect(states[0].mode).toBe("orbiting");
    const positions = states[0].positions;
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dist = positions[i].dist(positions[j]);
        expect(dist).toBeGreaterThan(100);
      }
    }
  });

  test("drones maintain orbit range from target while orbiting", () => {
    const sim = new DroneSimulatorImpl();
    sim.reset({ shipA: [lightDrone({ maxVelocity: 50000, optimal: 1500, orbitRange: 1000, orbitSpeed: 500, droneCount: 1 })], shipB: [] });
    const shipPos = new Vec2(0, 0);
    const targetPos = new Vec2(5000, 0);
    for (let i = 0; i < 200; i++) sim.step(0.1, frame(shipPos, targetPos));
    const states = sim.states("shipA");
    expect(states[0].mode).toBe("orbiting");
    const pos = states[0].positions[0];
    const dist = pos.dist(targetPos);
    expect(dist).toBeGreaterThan(500);
    expect(dist).toBeLessThan(2000);
  });

  test("target leaving control range causes drones to return", () => {
    const sim = new DroneSimulatorImpl();
    sim.reset({ shipA: [lightDrone({ maxVelocity: 1000, optimal: 1000, controlRange: 50000 })], shipB: [] });
    const shipPos = new Vec2(0, 0);
    const targetNear = new Vec2(3000, 0);
    for (let i = 0; i < 100; i++) sim.step(0.1, frame(shipPos, targetNear));
    expect(sim.states("shipA")[0].mode).toBe("orbiting");
    const targetFar = new Vec2(60000, 0);
    sim.step(0.1, frame(shipPos, targetFar));
    expect(sim.states("shipA")[0].mode).toBe("returning");
  });

  test("returning drones arrive at ship and become idle", () => {
    const sim = new DroneSimulatorImpl();
    sim.reset({ shipA: [lightDrone({ maxVelocity: 1000, optimal: 1000, controlRange: 50000, droneCount: 1 })], shipB: [] });
    const shipPos = new Vec2(0, 0);
    const targetNear = new Vec2(3000, 0);
    for (let i = 0; i < 100; i++) sim.step(0.1, frame(shipPos, targetNear));
    expect(sim.states("shipA")[0].mode).toBe("orbiting");
    const targetFar = new Vec2(60000, 0);
    sim.step(0.1, frame(shipPos, targetFar));
    expect(sim.states("shipA")[0].mode).toBe("returning");
    for (let i = 0; i < 500; i++) sim.step(0.1, frame(shipPos, targetFar));
    expect(sim.states("shipA")[0].mode).toBe("idle");
    for (const pos of sim.states("shipA")[0].positions) expect(pos).toEqual(shipPos);
  });

  test("each drone group tracks its own position independently", () => {
    const sim = new DroneSimulatorImpl();
    const drone1 = lightDrone({ maxVelocity: 3000, optimal: 1000, droneCount: 1 });
    const drone2 = lightDrone({ maxVelocity: 6000, optimal: 1000, droneCount: 1 });
    sim.reset({ shipA: [drone1, drone2], shipB: [] });
    const shipPos = new Vec2(0, 0);
    const targetPos = new Vec2(50000, 0);
    sim.step(0.001, frame(shipPos, targetPos));
    sim.step(1, frame(shipPos, targetPos));
    const states = sim.states("shipA");
    const pos1 = states[0].positions[0];
    const pos2 = states[1].positions[0];
    expect(pos2.x).toBeGreaterThan(pos1.x);
  });

  test("individual drones in a group have slightly different positions", () => {
    const sim = new DroneSimulatorImpl();
    sim.reset({ shipA: [lightDrone({ maxVelocity: 3000, optimal: 1000, droneCount: 5 })], shipB: [] });
    const shipPos = new Vec2(0, 0);
    const targetPos = new Vec2(50000, 0);
    sim.step(0.001, frame(shipPos, targetPos));
    const positions = sim.states("shipA")[0].positions;
    const first = positions[0];
    const anyDifferent = positions.some((p) => p.dist(first) > 1);
    expect(anyDifferent).toBe(true);
  });

  test("sentry drones deploy at initial ship position and stay fixed", () => {
    const sim = new DroneSimulatorImpl();
    sim.reset({ shipA: [sentryDrone()], shipB: [] });
    const deployPos = new Vec2(1000, 2000);
    const targetPos = new Vec2(50000, 0);
    sim.step(0.1, frame(deployPos, targetPos));
    for (const pos of sim.states("shipA")[0].positions) expect(pos).toEqual(deployPos);
    const shipMoved = new Vec2(5000, 5000);
    sim.step(0.1, frame(shipMoved, targetPos));
    for (const pos of sim.states("shipA")[0].positions) expect(pos).toEqual(deployPos);
    expect(sim.states("shipA")[0].distanceToTarget).toBeCloseTo(deployPos.dist(targetPos), 0);
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
    sim.reset({ shipA: [], shipB: [lightDrone({ maxVelocity: 3000, optimal: 1000, droneCount: 1 })] });
    const shipAPos = new Vec2(0, 0);
    const shipBPos = new Vec2(50000, 0);
    sim.step(0.001, frame(shipAPos, shipBPos));
    sim.step(1, frame(shipAPos, shipBPos));
    const states = sim.states("shipB");
    expect(states[0].mode).toBe("approaching");
    const pos = states[0].positions[0];
    expect(pos.x).toBeLessThan(shipBPos.x);
  });

  test("orbiting drones re-approach when fast target outruns orbit speed", () => {
    const sim = new DroneSimulatorImpl();
    sim.reset({ shipA: [lightDrone({ maxVelocity: 50000, optimal: 1500, orbitRange: 1000, orbitSpeed: 500, droneCount: 1 })], shipB: [] });
    const shipPos = new Vec2(0, 0);
    let targetPos = new Vec2(5000, 0);
    for (let i = 0; i < 200; i++) sim.step(0.1, frame(shipPos, targetPos));
    expect(sim.states("shipA")[0].mode).toBe("orbiting");
    const targetSpeed = 2000;
    let reApproached = false;
    for (let i = 0; i < 100; i++) {
      targetPos = new Vec2(targetPos.x + targetSpeed * 0.1, 0);
      sim.step(0.1, frame(shipPos, targetPos));
      if (sim.states("shipA")[0].mode === "approaching") reApproached = true;
    }
    expect(reApproached).toBe(true);
  });

  test("re-approaching drones catch up and re-enter orbiting", () => {
    const sim = new DroneSimulatorImpl();
    sim.reset({ shipA: [lightDrone({ maxVelocity: 50000, optimal: 1500, orbitRange: 1000, orbitSpeed: 500, droneCount: 1 })], shipB: [] });
    const shipPos = new Vec2(0, 0);
    let targetPos = new Vec2(5000, 0);
    for (let i = 0; i < 200; i++) sim.step(0.1, frame(shipPos, targetPos));
    expect(sim.states("shipA")[0].mode).toBe("orbiting");
    const targetSpeed = 2000;
    let reApproached = false;
    let reOrbited = false;
    for (let i = 0; i < 100; i++) {
      targetPos = new Vec2(targetPos.x + targetSpeed * 0.1, 0);
      sim.step(0.1, frame(shipPos, targetPos));
      const mode = sim.states("shipA")[0].mode;
      if (mode === "approaching") reApproached = true;
      if (reApproached && mode === "orbiting") reOrbited = true;
    }
    expect(reApproached).toBe(true);
    expect(reOrbited).toBe(true);
  });

  test("drones do not re-approach when target is slow", () => {
    const sim = new DroneSimulatorImpl();
    sim.reset({ shipA: [lightDrone({ maxVelocity: 50000, optimal: 1500, orbitRange: 1000, orbitSpeed: 500, droneCount: 1 })], shipB: [] });
    const shipPos = new Vec2(0, 0);
    let targetPos = new Vec2(5000, 0);
    for (let i = 0; i < 200; i++) sim.step(0.1, frame(shipPos, targetPos));
    expect(sim.states("shipA")[0].mode).toBe("orbiting");
    const targetSpeed = 100;
    for (let i = 0; i < 200; i++) {
      targetPos = new Vec2(targetPos.x + targetSpeed * 0.1, 0);
      sim.step(0.1, frame(shipPos, targetPos));
    }
    expect(sim.states("shipA")[0].mode).toBe("orbiting");
  });

  test("orbit step is capped to orbitSpeed even with high residual velocity", () => {
    const orbitSpeed = 500;
    const dt = 0.1;
    const sim = new DroneSimulatorImpl();
    sim.reset({ shipA: [lightDrone({ maxVelocity: 50000, optimal: 1500, orbitRange: 1000, orbitSpeed, droneCount: 1 })], shipB: [] });
    const shipPos = new Vec2(0, 0);
    const targetPos = new Vec2(5000, 0);
    for (let i = 0; i < 200; i++) sim.step(dt, frame(shipPos, targetPos));
    expect(sim.states("shipA")[0].mode).toBe("orbiting");
    let prevPos = new Vec2(sim.states("shipA")[0].positions[0].x, sim.states("shipA")[0].positions[0].y);
    const maxStep = orbitSpeed * dt + 1;
    for (let i = 0; i < 50; i++) {
      sim.step(dt, frame(shipPos, targetPos));
      const pos = sim.states("shipA")[0].positions[0];
      const moved = pos.dist(prevPos);
      expect(moved).toBeLessThanOrEqual(maxStep);
      prevPos = new Vec2(pos.x, pos.y);
    }
  });
});
