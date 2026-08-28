import type {
  Autopilot,
  EwarResolver,
  EngagementEvaluator,
  EngagementFrameComposer,
  HitChance,
  Kinematics,
  MissileApplication,
  SimValueParser,
  Simulation,
  StackingPenalty,
  TurretBoosterResolver,
  TurretDamage,
} from "./index";
import type { SimConfig } from "./types";

export interface SimCradle {
  readonly simValueParser: SimValueParser;
  readonly stackingPenalty: StackingPenalty;
  readonly ewarResolver: EwarResolver;
  readonly turretBoosterResolver: TurretBoosterResolver;
  readonly kinematics: Kinematics;
  readonly hitChance: HitChance;
  readonly missileApplication: MissileApplication;
  readonly turretDamage: TurretDamage;
  readonly reactiveSteering: Autopilot;
  readonly shipBSteering: Autopilot;
  readonly shipASteering: Autopilot;
  readonly simulation: Simulation;
  readonly engagementEvaluator: EngagementEvaluator;
  readonly engagementFrameComposer: EngagementFrameComposer;
  readonly simConfig: SimConfig;
}
