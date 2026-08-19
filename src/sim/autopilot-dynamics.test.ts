import { dist, len } from "../math";
import { ReactiveAutopilot } from "./autopilot";
import { SimulationImpl } from "./simulation";
import type { SimConfig } from "./types";

const simConfig: SimConfig = {
  attacker: { id: "attacker", maxSpeed: 0, mass: 1_200_000, inertiaModifier: 3, mode: "keepAtRange", desiredRange: 10_000, rangeWeight: 0.003 },
  target: { id: "target", maxSpeed: 1500, mass: 10_000_000, inertiaModifier: 0.45, mode: "orbit", desiredRange: 14_000, rangeWeight: 0.003, orbitDirection: "cw" },
  initialDistance: 5000,
};

const chaseConfig: SimConfig = {
  attacker: { id: "attacker", maxSpeed: 1300, mass: 15_500_000, inertiaModifier: 0.57, mode: "keepAtRange", desiredRange: 10_000, rangeWeight: 0.003 },
  target: { id: "target", maxSpeed: 1500, mass: 1_600_000, inertiaModifier: 2.8, mode: "orbit", desiredRange: 14_000, rangeWeight: 0.003, orbitDirection: "cw" },
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
  const steering = new ReactiveAutopilot();
  const sim = new SimulationImpl({ attackerSteering: steering, targetSteering: steering, simConfig: config });
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i < steps; i++) {
    sim.step(DT);
    const snapshot = sim.snapshot();
    const d = dist(snapshot.attacker.position, snapshot.target.position);
    if (d < min) min = d;
  }
  return min;
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
});
