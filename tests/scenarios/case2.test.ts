import { ReactiveAutopilot } from "../../src/sim/autopilot";
import type { EwarResolver } from "../../src/sim/ewarResolver";
import { KinematicsImpl } from "../../src/sim/kinematics";
import { PredictiveAutopilot } from "../../src/sim/predictiveAutopilot";
import { SimulationImpl } from "../../src/sim/simulation";
import type { ShipConfig, SimConfig } from "../../src/sim/types";

const ewarResolver: EwarResolver = { speedMultiplier: () => 1, disruptedTurret: (turret) => turret, propulsionSuppressed: () => false };

describe("case2: Merlin keepAtRange 2km vs Rifter orbit 11km", () => {
  test("predictive attacker reaches and holds within 15% of 2km", () => {
    const attacker: ShipConfig = {
      id: "attacker",
      maxSpeed: 1400,
      mass: 997_000,
      inertiaModifier: 3.6,
      mode: "keepAtRange",
      desiredRange: 2_000,
      aggressivity: 0.2,
      orbitDirection: "cw",
    };
    const target: ShipConfig = {
      id: "target",
      maxSpeed: 1200,
      mass: 1_067_000,
      inertiaModifier: 3.2,
      mode: "orbit",
      desiredRange: 11_000,
      aggressivity: 0.01,
      orbitDirection: "cw",
    };
    const simConfig: SimConfig = { attacker, target, initialDistance: 15_000 };

    const kinematics = new KinematicsImpl();
    const reactive = new ReactiveAutopilot();
    const predictive = new PredictiveAutopilot({ reactiveSteering: reactive, kinematics });
    const sim = new SimulationImpl({ attackerSteering: predictive, targetSteering: reactive, ewarResolver, simConfig });

    const dt = 0.25;
    const steps = Math.round(180 / dt);
    const windowSteps = Math.round(20 / dt);
    let minDistance = Number.POSITIVE_INFINITY;
    let maxInFinalWindow = 0;
    for (let i = 0; i < steps; i++) {
      sim.step(dt);
      const snap = sim.snapshot();
      const frame = kinematics.computeEngagement(snap.attacker, snap.target, snap.time);
      if (i >= steps - windowSteps) {
        maxInFinalWindow = Math.max(maxInFinalWindow, frame.distance);
      }
      if (frame.distance < minDistance) minDistance = frame.distance;
    }
    expect(minDistance).toBeLessThanOrEqual(2300);
    expect(maxInFinalWindow).toBeLessThanOrEqual(2300);
    expect(maxInFinalWindow).toBeGreaterThanOrEqual(1000);
  });
});
