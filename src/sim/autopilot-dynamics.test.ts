import { dist, len } from "../math";
import { ReactiveAutopilot } from "./autopilot";
import { SimulationImpl } from "./simulation";
import type { SimConfig } from "./types";

const simConfig: SimConfig = {
  attacker: { id: "attacker", maxSpeed: 0, mass: 1_200_000, inertiaModifier: 3, mode: "keepAtRange", desiredRange: 10_000, aggressivity: 1 },
  target: { id: "target", maxSpeed: 1500, mass: 10_000_000, inertiaModifier: 0.45, mode: "orbit", desiredRange: 14_000, aggressivity: 0.01, orbitDirection: "cw" },
  initialDistance: 5000,
};

const chaseConfig: SimConfig = {
  attacker: { id: "attacker", maxSpeed: 1300, mass: 15_500_000, inertiaModifier: 0.57, mode: "keepAtRange", desiredRange: 10_000, aggressivity: 1 },
  target: { id: "target", maxSpeed: 1500, mass: 1_600_000, inertiaModifier: 2.8, mode: "orbit", desiredRange: 14_000, aggressivity: 0.01, orbitDirection: "cw" },
  initialDistance: 14_000,
};

const DT = 1 / 60;
const STEPS = 180 * 60;

function runToSteadyState(): ReturnType<SimulationImpl["snapshot"]> {
  const steering = new ReactiveAutopilot();
  const sim = new SimulationImpl({ attackerSteering: steering, targetSteering: steering, simConfig });
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
  const sim = new SimulationImpl({ attackerSteering: steering, targetSteering: steering, simConfig: config });
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i < steps; i++) {
    sim.step(DT);
    const snapshot = sim.snapshot();
    const d = dist(snapshot.attacker.position, snapshot.target.position);
    if (d < min) min = d;
  }
  return { min, final: dist(sim.snapshot().attacker.position, sim.snapshot().target.position) };
}

describe("Autopilot + Dynamics", () => {
  test("orbit settles at its commanded radius despite dynamics lag", () => {
    const snapshot = runToSteadyState();
    const finalDistance = dist(snapshot.attacker.position, snapshot.target.position);
    expect(finalDistance).toBeGreaterThan(13300);
    expect(finalDistance).toBeLessThan(14700);
  });

  test("lag compensation consumes speed budget", () => {
    const snapshot = runToSteadyState();
    const targetSpeed = len(snapshot.target.velocity);
    expect(targetSpeed).toBeGreaterThan(1200);
    expect(targetSpeed).toBeLessThan(1450);
  });

  test("a faster orbiting Thrasher does not let a chasing Harbinger collapse the range", () => {
    const min = minDistance(chaseConfig, STEPS);
    expect(min).toBeGreaterThan(13_500);
  });

  test("the reported bug: a Harbinger keeper starting at 20km does not collapse on a Thrasher orbit", () => {
    const config: SimConfig = {
      attacker: { id: "attacker", maxSpeed: 1300, mass: 15_500_000, inertiaModifier: 0.57, mode: "keepAtRange", desiredRange: 10_000, aggressivity: 1 },
      target: { id: "target", maxSpeed: 1500, mass: 1_600_000, inertiaModifier: 2.8, mode: "orbit", desiredRange: 14_000, aggressivity: 0.01, orbitDirection: "cw" },
      initialDistance: 20_000,
    };
    const min = minDistance(config, STEPS);
    expect(min).toBeGreaterThan(13_300);
  });

  test("isolated strict keeper from 4R has no overshoot and settles", () => {
    const config: SimConfig = {
      attacker: { id: "attacker", maxSpeed: 1000, mass: 2_000_000, inertiaModifier: 1, mode: "keepAtRange", desiredRange: 5000, aggressivity: 0.01 },
      target: { id: "target", maxSpeed: 0, mass: 1, inertiaModifier: 1e-6, mode: "keepAtRange", desiredRange: 5000, aggressivity: 1 },
      initialDistance: 20_000,
    };
    const { min, final } = approachResult(config, 60 * 60);
    expect(min).toBeGreaterThanOrEqual(4900);
    expect(final).toBeGreaterThan(4500);
    expect(final).toBeLessThan(5500);
  });

  test("isolated loose keeper overshoots before settling", () => {
    const config: SimConfig = {
      attacker: { id: "attacker", maxSpeed: 1000, mass: 2_000_000, inertiaModifier: 1, mode: "keepAtRange", desiredRange: 5000, aggressivity: 10 },
      target: { id: "target", maxSpeed: 0, mass: 1, inertiaModifier: 1e-6, mode: "keepAtRange", desiredRange: 5000, aggressivity: 1 },
      initialDistance: 20_000,
    };
    const { min, final } = approachResult(config, 60 * 60);
    expect(min).toBeLessThan(4500);
    expect(final).toBeGreaterThan(4500);
    expect(final).toBeLessThan(5500);
  });
});
