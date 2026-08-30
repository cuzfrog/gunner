import type { Vec2 } from "./vec2";
import { ReactiveAutopilot } from "./autopilot";
import type { EwarResolver } from "./ewarResolver";
import { SimulationImpl } from "./simulation";
import type { SimConfig } from "./types";

const ewarResolver: EwarResolver = {
  speedMultiplier: () => 1,
  speedMultiplierIgnoringRange: () => 1, sigMultiplier: () => 1, sigMultiplierIgnoringRange: () => 1, disruptedTurret: (turret) => turret,
  disruptedTurretIgnoringRange: (turret) => turret,
  propulsionSuppressed: () => false,
  propulsionSuppressedIgnoringRange: () => false,
  appliedEffects: () => [],
  speedBreakdown: () => ({ effects: [], propulsionSuppressed: false }),
  disruptionBreakdown: () => ({ tracking: [], optimal: [], falloff: [] }),
};

const simConfig: SimConfig = {
  shipA: { id: "shipA", maxSpeed: 0, mass: 1_200_000, inertiaModifier: 3, mode: "keepAtRange", desiredRange: 10_000, aggressivity: 1 },
  shipB: { id: "shipB", maxSpeed: 1500, mass: 10_000_000, inertiaModifier: 0.45, mode: "orbit", desiredRange: 14_000, aggressivity: 0.01, orbitDirection: "cw" },
  initialDistance: 5000,
};

const chaseConfig: SimConfig = {
  shipA: { id: "shipA", maxSpeed: 1300, mass: 15_500_000, inertiaModifier: 0.57, mode: "keepAtRange", desiredRange: 10_000, aggressivity: 1 },
  shipB: { id: "shipB", maxSpeed: 1500, mass: 1_600_000, inertiaModifier: 2.8, mode: "orbit", desiredRange: 14_000, aggressivity: 0.01, orbitDirection: "cw" },
  initialDistance: 14_000,
};

const DT = 1 / 60;
const STEPS = 180 * 60;

function runToSteadyState(): ReturnType<SimulationImpl["snapshot"]> {
  const steering = new ReactiveAutopilot();
  const sim = new SimulationImpl({ shipASteering: steering, shipBSteering: steering, ewarResolver, simConfig });
  for (let i = 0; i < STEPS; i++) {
    sim.step(DT);
  }
  return sim.snapshot();
}

function minDistance(config: SimConfig, steps: number): number {
  return approachResult(config, steps).min;
}

function approachResult(config: SimConfig, steps: number): { min: number; final: number } {
  const steering = new ReactiveAutopilot();
  const sim = new SimulationImpl({ shipASteering: steering, shipBSteering: steering, ewarResolver, simConfig: config });
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i < steps; i++) {
    sim.step(DT);
    const snapshot = sim.snapshot();
    const d = snapshot.shipA.position.dist(snapshot.shipB.position);
    if (d < min) min = d;
  }
  return { min, final: sim.snapshot().shipA.position.dist(sim.snapshot().shipB.position) };
}

describe("Autopilot + Dynamics", () => {
  test("orbit settles at its commanded radius despite dynamics lag", () => {
    const snapshot = runToSteadyState();
    const finalDistance = snapshot.shipA.position.dist(snapshot.shipB.position);
    expect(finalDistance).toBeGreaterThan(13300);
    expect(finalDistance).toBeLessThan(14700);
  });

  test("lag compensation consumes speed budget", () => {
    const snapshot = runToSteadyState();
    const shipBSpeed = snapshot.shipB.velocity.len();
    expect(shipBSpeed).toBeGreaterThan(1200);
    expect(shipBSpeed).toBeLessThan(1450);
  });

  test("a faster orbiting Thrasher does not let a chasing Harbinger collapse the range", () => {
    const min = minDistance(chaseConfig, STEPS);
    expect(min).toBeGreaterThan(13_500);
  });

  test("the reported bug: a Harbinger keeper starting at 20km does not collapse on a Thrasher orbit", () => {
    const config: SimConfig = {
      shipA: { id: "shipA", maxSpeed: 1300, mass: 15_500_000, inertiaModifier: 0.57, mode: "keepAtRange", desiredRange: 10_000, aggressivity: 1 },
      shipB: { id: "shipB", maxSpeed: 1500, mass: 1_600_000, inertiaModifier: 2.8, mode: "orbit", desiredRange: 14_000, aggressivity: 0.01, orbitDirection: "cw" },
      initialDistance: 20_000,
    };
    const min = minDistance(config, STEPS);
    expect(min).toBeGreaterThan(13_300);
  });

  test("isolated keep-at-range overshoot grows monotonically with aggressivity", () => {
    const make = (aggressivity: number): SimConfig => ({
      shipA: { id: "shipA", maxSpeed: 1000, mass: 2_000_000, inertiaModifier: 1, mode: "keepAtRange", desiredRange: 5000, aggressivity },
      shipB: { id: "shipB", maxSpeed: 0, mass: 1, inertiaModifier: 1e-6, mode: "keepAtRange", desiredRange: 5000, aggressivity: 1 },
      initialDistance: 20_000,
    });

    const low = approachResult(make(0.01), 60 * 60);
    const mid = approachResult(make(1), 60 * 60);
    const loose = approachResult(make(10), 60 * 60);
    const loosest = approachResult(make(100), 60 * 60);

    expect(low.min).toBeGreaterThanOrEqual(4900);
    expect(loose.min).toBeLessThan(4500);
    expect(loosest.min).toBeLessThan(4500);

    expect(low.min).toBeGreaterThanOrEqual(mid.min);
    expect(mid.min).toBeGreaterThanOrEqual(loose.min);
    expect(loose.min).toBeGreaterThanOrEqual(loosest.min);

    expect(low.final).toBeGreaterThan(4500);
    expect(low.final).toBeLessThan(5500);
    expect(loosest.final).toBeGreaterThan(4500);
    expect(loosest.final).toBeLessThan(5500);
  });
});
