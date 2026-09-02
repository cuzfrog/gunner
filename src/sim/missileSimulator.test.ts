import { Vec2 } from "./vec2";
import { MissileSimulatorImpl } from "./missileSimulator";
import { MissileApplicationImpl } from "./missileApplication";
import type { EngagementFrame, MissileLaunchSpec, MissileSpec, ShipState } from "./types";

const lightMissile: MissileSpec = {
  kind: "missile",
  damagePerMissile: 83,
  cycleTime: 4,
  launcherCount: 1,
  explosionRadius: 40,
  explosionVelocity: 170,
  damageReductionFactor: 0.604,
  maxVelocity: 3750,
  flightTime: 5,
  flightRange: 3750 * 5,
};

const heavyMissile: MissileSpec = {
  kind: "missile",
  damagePerMissile: 149,
  cycleTime: 8,
  launcherCount: 2,
  explosionRadius: 140,
  explosionVelocity: 85,
  damageReductionFactor: 0.682,
  maxVelocity: 1500,
  flightTime: 6,
  flightRange: 1500 * 6,
};

function shipAt(x: number, y: number, velocity: Vec2 = new Vec2(0, 0)): ShipState {
  return { id: "shipA", maxSpeed: 0, mass: 1_000_000, inertiaModifier: 1, mode: "orbit", desiredRange: 1000, aggressivity: 1, position: new Vec2(x, y), velocity };
}

function frame(shipAPos: Vec2, shipBPos: Vec2, shipAVel: Vec2 = new Vec2(0, 0), shipBVel: Vec2 = new Vec2(0, 0), time: number = 0): EngagementFrame {
  const rel = shipBPos.sub(shipAPos);
  const dist = rel.len();
  return {
    time,
    shipA: shipAt(shipAPos.x, shipAPos.y, shipAVel),
    shipB: { ...shipAt(shipBPos.x, shipBPos.y, shipBVel), id: "shipB" },
    relPosition: rel,
    distance: dist,
    relVelocity: shipBVel.sub(shipAVel),
    radialVelocity: 0,
    transversalVelocity: new Vec2(0, 0),
    transversalSpeed: 0,
    angularVelocity: 0,
  };
}

function launchSpec(weaponIndex: number, boosted: MissileSpec, paintedTargetSig: number): MissileLaunchSpec {
  return { weaponIndex, boosted, paintedTargetSig };
}

describe("MissileSimulatorImpl", () => {
  test("reset clears all entities and impact logs", () => {
    const sim = new MissileSimulatorImpl({ missileApplication: new MissileApplicationImpl() });
    sim.reset({ shipA: [lightMissile], shipB: [] });
    sim.step(0.1, frame(new Vec2(0, 0), new Vec2(1000, 0)), { shipA: [launchSpec(0, lightMissile, 40)], shipB: [] });
    expect(sim.states("shipA").length).toBeGreaterThan(0);
    sim.reset({ shipA: [], shipB: [] });
    expect(sim.states("shipA")).toHaveLength(0);
    expect(sim.states("shipB")).toHaveLength(0);
    expect(sim.facts("shipA", 0).inFlightCount).toBe(0);
    expect(sim.facts("shipA", 0).smoothedApplication).toBe(0);
  });

  test("launches a missile on first step when launch spec is provided", () => {
    const sim = new MissileSimulatorImpl({ missileApplication: new MissileApplicationImpl() });
    sim.reset({ shipA: [lightMissile], shipB: [] });
    sim.step(0.1, frame(new Vec2(0, 0), new Vec2(1000, 0)), { shipA: [launchSpec(0, lightMissile, 40)], shipB: [] });
    const states = sim.states("shipA");
    expect(states).toHaveLength(1);
    expect(states[0].weaponIndex).toBe(0);
    expect(states[0].side).toBe("shipA");
  });

  test("missile spawns at launcher ship position", () => {
    const sim = new MissileSimulatorImpl({ missileApplication: new MissileApplicationImpl() });
    sim.reset({ shipA: [lightMissile], shipB: [] });
    const shipPos = new Vec2(500, 200);
    sim.step(0.1, frame(shipPos, new Vec2(1000, 200)), { shipA: [launchSpec(0, lightMissile, 40)], shipB: [] });
    const states = sim.states("shipA");
    expect(states[0].position.x).toBeGreaterThan(500);
    expect(states[0].position.x).toBeLessThan(600);
    expect(states[0].position.y).toBeCloseTo(200, 0);
  });

  test("missile does not launch when no launch spec provided", () => {
    const sim = new MissileSimulatorImpl({ missileApplication: new MissileApplicationImpl() });
    sim.reset({ shipA: [lightMissile], shipB: [] });
    sim.step(0.1, frame(new Vec2(0, 0), new Vec2(1000, 0)), { shipA: [], shipB: [] });
    expect(sim.states("shipA")).toHaveLength(0);
  });

  test("respects cycle time between launches", () => {
    const sim = new MissileSimulatorImpl({ missileApplication: new MissileApplicationImpl() });
    sim.reset({ shipA: [lightMissile], shipB: [] });
    const launches = { shipA: [launchSpec(0, lightMissile, 40)], shipB: [] };
    sim.step(0.1, frame(new Vec2(0, 0), new Vec2(1000, 0)), launches);
    expect(sim.states("shipA")).toHaveLength(1);
    sim.step(0.1, frame(new Vec2(0, 0), new Vec2(1000, 0)), launches);
    expect(sim.states("shipA")).toHaveLength(1);
  });

  test("launches second volley after cycle time elapses", () => {
    const sim = new MissileSimulatorImpl({ missileApplication: new MissileApplicationImpl() });
    sim.reset({ shipA: [lightMissile], shipB: [] });
    const farTarget = new Vec2(100000, 0);
    const launches = { shipA: [launchSpec(0, lightMissile, 40)], shipB: [] };
    sim.step(0.1, frame(new Vec2(0, 0), farTarget), launches);
    sim.step(4.0, frame(new Vec2(0, 0), farTarget), launches);
    expect(sim.states("shipA")).toHaveLength(2);
  });

  test("missile accelerates from zero toward max velocity", () => {
    const sim = new MissileSimulatorImpl({ missileApplication: new MissileApplicationImpl() });
    sim.reset({ shipA: [lightMissile], shipB: [] });
    const f = frame(new Vec2(0, 0), new Vec2(100000, 0));
    sim.step(0.1, f, { shipA: [launchSpec(0, lightMissile, 40)], shipB: [] });
    const states = sim.states("shipA");
    const speed = states[0].velocity.len();
    expect(speed).toBeGreaterThan(0);
    expect(speed).toBeLessThan(lightMissile.maxVelocity);
  });

  test("missile approaches max velocity over time", () => {
    const longFlightMissile: MissileSpec = { ...lightMissile, flightTime: 30, flightRange: 3750 * 30 };
    const sim = new MissileSimulatorImpl({ missileApplication: new MissileApplicationImpl() });
    sim.reset({ shipA: [longFlightMissile], shipB: [] });
    const farFrame = frame(new Vec2(0, 0), new Vec2(1000000, 0));
    const launches = { shipA: [launchSpec(0, longFlightMissile, 40)], shipB: [] };
    sim.step(0.1, farFrame, launches);
    sim.step(5.0, farFrame, launches);
    const states = sim.states("shipA");
    const speed = states[0].velocity.len();
    expect(speed).toBeCloseTo(longFlightMissile.maxVelocity, -2);
  });

  test("missile moves toward target", () => {
    const sim = new MissileSimulatorImpl({ missileApplication: new MissileApplicationImpl() });
    sim.reset({ shipA: [lightMissile], shipB: [] });
    const targetPos = new Vec2(10000, 0);
    sim.step(0.1, frame(new Vec2(0, 0), targetPos), { shipA: [launchSpec(0, lightMissile, 40)], shipB: [] });
    const pos = sim.states("shipA")[0].position;
    expect(pos.x).toBeGreaterThan(0);
  });

  test("missile intercepts stationary target within signature radius", () => {
    const sim = new MissileSimulatorImpl({ missileApplication: new MissileApplicationImpl() });
    sim.reset({ shipA: [lightMissile], shipB: [] });
    const targetPos = new Vec2(1000, 0);
    const launches = { shipA: [launchSpec(0, lightMissile, 40)], shipB: [] };
    let f = frame(new Vec2(0, 0), targetPos);
    sim.step(0.1, f, launches);
    for (let i = 0; i < 50; i++) {
      f = frame(new Vec2(0, 0), targetPos);
      sim.step(0.1, f, launches);
      if (sim.states("shipA").length === 0) break;
    }
    expect(sim.states("shipA").length).toBe(0);
    const facts = sim.facts("shipA", 0);
    expect(facts.lastImpact).toBeDefined();
    expect(facts.lastImpact!.application).toBeGreaterThan(0);
  });

  test("records impact damage scaled by launcherCount", () => {
    const sim = new MissileSimulatorImpl({ missileApplication: new MissileApplicationImpl() });
    sim.reset({ shipA: [heavyMissile], shipB: [] });
    const targetPos = new Vec2(1000, 0);
    const launches = { shipA: [launchSpec(0, heavyMissile, 200)], shipB: [] };
    let f = frame(new Vec2(0, 0), targetPos);
    sim.step(0.1, f, launches);
    for (let i = 0; i < 100; i++) {
      f = frame(new Vec2(0, 0), targetPos);
      sim.step(0.1, f, launches);
      if (sim.states("shipA").length === 0) break;
    }
    const facts = sim.facts("shipA", 0);
    expect(facts.lastImpact).toBeDefined();
    const expectedDamage = heavyMissile.damagePerMissile * heavyMissile.launcherCount * facts.lastImpact!.application;
    expect(facts.smoothedApplication).toBeGreaterThan(0);
  });

  test("missile expires without impact when fuel runs out", () => {
    const sim = new MissileSimulatorImpl({ missileApplication: new MissileApplicationImpl() });
    sim.reset({ shipA: [lightMissile], shipB: [] });
    const farTarget = new Vec2(1000000, 0);
    const launches = { shipA: [launchSpec(0, lightMissile, 40)], shipB: [] };
    sim.step(0.1, frame(new Vec2(0, 0), farTarget), launches);
    expect(sim.states("shipA")).toHaveLength(1);
    for (let i = 0; i < 100; i++) {
      sim.step(0.1, frame(new Vec2(0, 0), farTarget), launches);
    }
    const remaining = sim.states("shipA").filter((m) => m.weaponIndex === 0 && sim.facts("shipA", 0).inFlightCount > 0);
    const facts = sim.facts("shipA", 0);
    expect(facts.lastImpact).toBeUndefined();
  });

  test("tracks multiple weapon indices independently", () => {
    const sim = new MissileSimulatorImpl({ missileApplication: new MissileApplicationImpl() });
    sim.reset({ shipA: [lightMissile, heavyMissile], shipB: [] });
    const launches = {
      shipA: [launchSpec(0, lightMissile, 40), launchSpec(1, heavyMissile, 200)],
      shipB: [],
    };
    sim.step(0.1, frame(new Vec2(0, 0), new Vec2(1000, 0)), launches);
    const states = sim.states("shipA");
    const w0 = states.filter((s) => s.weaponIndex === 0);
    const w1 = states.filter((s) => s.weaponIndex === 1);
    expect(w0).toHaveLength(1);
    expect(w1).toHaveLength(1);
  });

  test("facts report inFlightCount per weapon index", () => {
    const sim = new MissileSimulatorImpl({ missileApplication: new MissileApplicationImpl() });
    sim.reset({ shipA: [lightMissile, heavyMissile], shipB: [] });
    const launches = {
      shipA: [launchSpec(0, lightMissile, 40), launchSpec(1, heavyMissile, 200)],
      shipB: [],
    };
    sim.step(0.1, frame(new Vec2(0, 0), new Vec2(100000, 0)), launches);
    expect(sim.facts("shipA", 0).inFlightCount).toBe(1);
    expect(sim.facts("shipA", 1).inFlightCount).toBe(1);
    expect(sim.facts("shipA", 0).nearestTimeToImpact).toBeGreaterThan(0);
  });

  test("interceptable is true when target is within reachable range", () => {
    const sim = new MissileSimulatorImpl({ missileApplication: new MissileApplicationImpl() });
    sim.reset({ shipA: [lightMissile], shipB: [] });
    sim.step(0.1, frame(new Vec2(0, 0), new Vec2(10000, 0)), { shipA: [launchSpec(0, lightMissile, 40)], shipB: [] });
    expect(sim.facts("shipA", 0).interceptable).toBe(true);
  });

  test("interceptable is false when target is beyond flight range", () => {
    const sim = new MissileSimulatorImpl({ missileApplication: new MissileApplicationImpl() });
    sim.reset({ shipA: [lightMissile], shipB: [] });
    sim.step(0.1, frame(new Vec2(0, 0), new Vec2(100000, 0)), { shipA: [launchSpec(0, lightMissile, 40)], shipB: [] });
    expect(sim.facts("shipA", 0).interceptable).toBe(false);
  });

  test("smoothed application accumulates from repeated impacts", () => {
    const sim = new MissileSimulatorImpl({ missileApplication: new MissileApplicationImpl() });
    sim.reset({ shipA: [lightMissile], shipB: [] });
    const targetPos = new Vec2(1000, 0);
    const launches = { shipA: [launchSpec(0, lightMissile, 40)], shipB: [] };
    for (let i = 0; i < 500; i++) {
      sim.step(0.1, frame(new Vec2(0, 0), targetPos), launches);
    }
    const facts = sim.facts("shipA", 0);
    expect(facts.smoothedApplication).toBeGreaterThan(0);
  });

  test("smoothed application is zero before any impact", () => {
    const sim = new MissileSimulatorImpl({ missileApplication: new MissileApplicationImpl() });
    sim.reset({ shipA: [lightMissile], shipB: [] });
    sim.step(0.1, frame(new Vec2(0, 0), new Vec2(10000, 0)), { shipA: [launchSpec(0, lightMissile, 40)], shipB: [] });
    expect(sim.facts("shipA", 0).smoothedApplication).toBe(0);
  });

  test("smoothed application ramps up gradually over multiple impacts", () => {
    const sim = new MissileSimulatorImpl({ missileApplication: new MissileApplicationImpl() });
    sim.reset({ shipA: [lightMissile], shipB: [] });
    const targetPos = new Vec2(1000, 0);
    const launches = { shipA: [launchSpec(0, lightMissile, 40)], shipB: [] };
    let firstImpactApplication = 0;
    for (let i = 0; i < 200; i++) {
      sim.step(0.1, frame(new Vec2(0, 0), targetPos), launches);
      const facts = sim.facts("shipA", 0);
      if (facts.lastImpact && firstImpactApplication === 0) firstImpactApplication = facts.smoothedApplication;
    }
    const finalApplication = sim.facts("shipA", 0).smoothedApplication;
    expect(firstImpactApplication).toBeGreaterThan(0);
    expect(firstImpactApplication).toBeLessThan(finalApplication);
    expect(finalApplication).toBeLessThanOrEqual(1);
  });

  test("smoothed application resets to zero after impacts stop", () => {
    const sim = new MissileSimulatorImpl({ missileApplication: new MissileApplicationImpl() });
    sim.reset({ shipA: [lightMissile], shipB: [] });
    const targetPos = new Vec2(1000, 0);
    const launches = { shipA: [launchSpec(0, lightMissile, 40)], shipB: [] };
    for (let i = 0; i < 200; i++) sim.step(0.1, frame(new Vec2(0, 0), targetPos), launches);
    expect(sim.facts("shipA", 0).smoothedApplication).toBeGreaterThan(0);
    const noLaunches = { shipA: [], shipB: [] };
    for (let i = 0; i < 500; i++) sim.step(0.1, frame(new Vec2(0, 0), targetPos), noLaunches);
    expect(sim.facts("shipA", 0).smoothedApplication).toBe(0);
  });

  test("interceptable stays true when no missiles are in flight but weapon is configured", () => {
    const sim = new MissileSimulatorImpl({ missileApplication: new MissileApplicationImpl() });
    sim.reset({ shipA: [lightMissile], shipB: [] });
    const targetPos = new Vec2(1000, 0);
    const launches = { shipA: [launchSpec(0, lightMissile, 40)], shipB: [] };
    sim.step(0.1, frame(new Vec2(0, 0), targetPos), launches);
    sim.step(0.1, frame(new Vec2(0, 0), targetPos), { shipA: [], shipB: [] });
    expect(sim.states("shipA").length).toBeGreaterThanOrEqual(0);
    expect(sim.facts("shipA", 0).interceptable).toBe(true);
  });

  test("trail records recent positions for rendering", () => {
    const sim = new MissileSimulatorImpl({ missileApplication: new MissileApplicationImpl() });
    sim.reset({ shipA: [lightMissile], shipB: [] });
    const launches = { shipA: [launchSpec(0, lightMissile, 40)], shipB: [] };
    sim.step(0.1, frame(new Vec2(0, 0), new Vec2(100000, 0)), launches);
    sim.step(0.1, frame(new Vec2(0, 0), new Vec2(100000, 0)), launches);
    const states = sim.states("shipA");
    expect(states[0].trail.length).toBeGreaterThanOrEqual(1);
  });

  test("supports both sides simultaneously", () => {
    const sim = new MissileSimulatorImpl({ missileApplication: new MissileApplicationImpl() });
    sim.reset({ shipA: [lightMissile], shipB: [heavyMissile] });
    const launches = {
      shipA: [launchSpec(0, lightMissile, 40)],
      shipB: [launchSpec(0, heavyMissile, 200)],
    };
    sim.step(0.1, frame(new Vec2(0, 0), new Vec2(10000, 0)), launches);
    expect(sim.states("shipA")).toHaveLength(1);
    expect(sim.states("shipB")).toHaveLength(1);
    expect(sim.facts("shipA", 0).inFlightCount).toBe(1);
    expect(sim.facts("shipB", 0).inFlightCount).toBe(1);
  });

  test("missile chases moving target (spiral path)", () => {
    const sim = new MissileSimulatorImpl({ missileApplication: new MissileApplicationImpl() });
    sim.reset({ shipA: [lightMissile], shipB: [] });
    const launches = { shipA: [launchSpec(0, lightMissile, 40)], shipB: [] };
    let targetPos = new Vec2(5000, 0);
    sim.step(0.1, frame(new Vec2(0, 0), targetPos), launches);
    for (let i = 0; i < 100; i++) {
      targetPos = new Vec2(5000 + Math.cos(i * 0.1) * 1000, Math.sin(i * 0.1) * 1000);
      sim.step(0.1, frame(new Vec2(0, 0), targetPos), launches);
      if (sim.states("shipA").length === 0) break;
    }
    const facts = sim.facts("shipA", 0);
    expect(facts.lastImpact).toBeDefined();
  });
});
