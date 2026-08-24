import type { Autopilot, EwarResolver, EngagementEvaluator, HitChance, Kinematics, Simulation, StackingPenalty, TurretBoosterResolver } from "./index";
import type { SimConfig } from "./types";

export interface SimCradle {
  readonly stackingPenalty: StackingPenalty;
  readonly ewarResolver: EwarResolver;
  readonly turretBoosterResolver: TurretBoosterResolver;
  readonly kinematics: Kinematics;
  readonly hitChance: HitChance;
  readonly reactiveSteering: Autopilot;
  readonly targetSteering: Autopilot;
  readonly attackerSteering: Autopilot;
  readonly simulation: Simulation;
  readonly engagementEvaluator: EngagementEvaluator;
  readonly simConfig: SimConfig;
}
