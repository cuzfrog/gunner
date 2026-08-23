import type { Autopilot, EwarResolver, HitChance, Kinematics, Simulation, StackingPenalty } from "./index";
import type { SimConfig } from "./types";

export interface SimCradle {
  readonly stackingPenalty: StackingPenalty;
  readonly ewarResolver: EwarResolver;
  readonly kinematics: Kinematics;
  readonly hitChance: HitChance;
  readonly reactiveSteering: Autopilot;
  readonly targetSteering: Autopilot;
  readonly attackerSteering: Autopilot;
  readonly simulation: Simulation;
  readonly simConfig: SimConfig;
}
