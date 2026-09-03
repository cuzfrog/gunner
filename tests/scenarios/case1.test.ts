import { ReactiveAutopilot } from "../../src/sim/autopilot";
import type { EwarResolver } from "../../src/sim/ewarResolver";
import { KinematicsImpl } from "../../src/sim/kinematics";
import { PredictiveAutopilot } from "../../src/sim/predictiveAutopilot";
import { SimulationImpl } from "../../src/sim/simulation";
import type { ShipConfig, SimConfig } from "../../src/sim/types";

const ewarResolver: EwarResolver = { speedMultiplier: () => 1, speedMultiplierIgnoringRange: () => 1, sigMultiplier: () => 1, sigMultiplierIgnoringRange: () => 1, disruptedTurret: (turret) => turret, disruptedTurretIgnoringRange: (turret) => turret, propulsionSuppressed: () => false, propulsionSuppressedIgnoringRange: () => false, appliedEffects: () => [], speedBreakdown: () => ({ effects: [], propulsionSuppressed: false }), disruptionBreakdown: () => ({ tracking: [], optimal: [], falloff: [] }), dampenedSensorSpec: (spec, projection, distance) => spec, dampenedSensorSpecIgnoringRange: (spec, projection) => spec };

describe("case1: Harbinger keepAtRange 10km vs Thrasher orbit 14km", () => {
  test("predictive steering reduces mean angular velocity versus the reactive baseline", () => {
    const shipAConfig: ShipConfig = {
      id: "shipA",
      maxSpeed: 1300,
      mass: 15_500_000,
      inertiaModifier: 0.57,
      mode: "keepAtRange",
      desiredRange: 10_000,
      aggressivity: 1,
    };
    const shipAPredictive: ShipConfig = { ...shipAConfig, mode: "maneuver" };
    const shipBConfig: ShipConfig = {
      id: "shipB",
      maxSpeed: 1500,
      mass: 1_600_000,
      inertiaModifier: 2.8,
      mode: "orbit",
      desiredRange: 14_000,
      aggressivity: 0.01,
      orbitDirection: "cw",
    };
    const baselineConfig: SimConfig = { shipA: shipAConfig, shipB: shipBConfig, initialDistance: 14_000 };
    const predictiveConfig: SimConfig = { shipA: shipAPredictive, shipB: shipBConfig, initialDistance: 14_000 };

    const reactive = new ReactiveAutopilot();
    const kinematicsForSim = new KinematicsImpl();
    const baseline = new SimulationImpl({ shipASteering: reactive, shipBSteering: reactive, ewarResolver, simConfig: baselineConfig });
    const predictive = new PredictiveAutopilot({ reactiveSteering: new ReactiveAutopilot(), kinematics: kinematicsForSim });
    const predictiveSim = new SimulationImpl({ shipASteering: predictive, shipBSteering: new ReactiveAutopilot(), ewarResolver, simConfig: predictiveConfig });

    const dt = 0.25;
    const steps = Math.round(120 / dt);
    let meanBaseline = 0;
    let meanPredictive = 0;
    for (let i = 0; i < steps; i++) {
      baseline.step(dt);
      predictiveSim.step(dt);
      const baseSnap = baseline.snapshot();
      const predSnap = predictiveSim.snapshot();
      const baseFrame = kinematicsForSim.computeEngagement(baseSnap.shipA, baseSnap.shipB, baseSnap.time);
      const predFrame = kinematicsForSim.computeEngagement(predSnap.shipA, predSnap.shipB, predSnap.time);
      meanBaseline += baseFrame.angularVelocity;
      meanPredictive += predFrame.angularVelocity;
    }
    meanBaseline /= steps;
    meanPredictive /= steps;

    expect(meanPredictive).toBeGreaterThan(0);
    expect(meanPredictive).toBeLessThan(0.7 * meanBaseline);
  });
});
