import type { Autopilot, HitChance, Kinematics, Simulation } from "./index";
import type { SimConfig } from "./types";

export interface SimCradle {
  readonly kinematics: Kinematics;
  readonly hitChance: HitChance;
  readonly reactiveSteering: Autopilot;
  readonly targetSteering: Autopilot;
  readonly attackerSteering: Autopilot;
  readonly simulation: Simulation;
  readonly simConfig: SimConfig;
}
