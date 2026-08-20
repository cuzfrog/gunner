import { ReactiveAutopilot } from "../../src/sim/autopilot";
import { KinematicsImpl } from "../../src/sim/kinematics";
import { PredictiveAutopilot } from "../../src/sim/predictiveAutopilot";
import { SimulationImpl } from "../../src/sim/simulation";
import type { ShipConfig, SimConfig } from "../../src/sim/types";

describe("case1: Harbinger keepAtRange 10km vs Thrasher orbit 14km", () => {
  test("predictive steering reduces mean angular velocity versus the reactive baseline", () => {
    const attackerConfig: ShipConfig = {
      id: "attacker",
      maxSpeed: 1300,
      mass: 15_500_000,
      inertiaModifier: 0.57,
      mode: "keepAtRange",
      desiredRange: 10_000,
      aggressivity: 1,
    };
    const targetConfig: ShipConfig = {
      id: "target",
      maxSpeed: 1500,
      mass: 1_600_000,
      inertiaModifier: 2.8,
      mode: "orbit",
      desiredRange: 14_000,
      aggressivity: 0.01,
      orbitDirection: "cw",
    };
    const simConfig: SimConfig = { attacker: attackerConfig, target: targetConfig, initialDistance: 14_000 };

    const reactive = new ReactiveAutopilot();
    const kinematicsForSim = new KinematicsImpl();
    const baseline = new SimulationImpl({ attackerSteering: reactive, targetSteering: reactive, simConfig });
    const predictive = new PredictiveAutopilot({ reactiveSteering: new ReactiveAutopilot(), kinematics: kinematicsForSim });
    const predictiveSim = new SimulationImpl({ attackerSteering: predictive, targetSteering: new ReactiveAutopilot(), simConfig });

    const dt = 0.25;
    const steps = Math.round(120 / dt);
    let meanBaseline = 0;
    let meanPredictive = 0;
    for (let i = 0; i < steps; i++) {
      baseline.step(dt);
      predictiveSim.step(dt);
      const baseSnap = baseline.snapshot();
      const predSnap = predictiveSim.snapshot();
      const baseFrame = kinematicsForSim.computeEngagement(baseSnap.attacker, baseSnap.target, baseSnap.time);
      const predFrame = kinematicsForSim.computeEngagement(predSnap.attacker, predSnap.target, predSnap.time);
      meanBaseline += baseFrame.angularVelocity;
      meanPredictive += predFrame.angularVelocity;
    }
    meanBaseline /= steps;
    meanPredictive /= steps;

    expect(meanPredictive).toBeGreaterThan(0);
    expect(meanPredictive).toBeLessThan(0.7 * meanBaseline);
  });
});
