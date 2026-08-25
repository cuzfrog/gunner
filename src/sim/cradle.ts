import type {
  Autopilot,
  EwarResolver,
  EngagementEvaluator,
  EngagementFrameComposer,
  HitChance,
  Kinematics,
  Simulation,
  StackingPenalty,
  TurretBoosterResolver,
} from "./index";
import type { SimConfig } from "./types";
import type { SettingGuards } from "../appstate";

export interface SimCradle {
  readonly settingGuards: SettingGuards;
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
  readonly engagementFrameComposer: EngagementFrameComposer;
  readonly simConfig: SimConfig;
}
