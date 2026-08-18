import { dist, len } from "../math";
import { AutopilotImpl } from "./autopilot";
import { SimulationImpl } from "./simulation";
import type { SimConfig } from "./types";

const simConfig: SimConfig = {
  attacker: { id: "attacker", maxSpeed: 0, mass: 1_200_000, inertiaModifier: 3, mode: "keepAtRange", desiredRange: 10_000 },
  target: { id: "target", maxSpeed: 1500, mass: 10_000_000, inertiaModifier: 0.45, mode: "orbit", desiredRange: 14_000 },
  initialDistance: 5000,
};

const DT = 1 / 60;
const STEPS = 180 * 60;

function runToSteadyState(): ReturnType<SimulationImpl["snapshot"]> {
  const sim = new SimulationImpl({ autopilot: new AutopilotImpl(), simConfig });
  for (let i = 0; i < STEPS; i++) {
    sim.step(DT);
  }
  return sim.snapshot();
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
});
