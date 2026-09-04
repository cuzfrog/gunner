import type {
  Autopilot,
  DefenseAssessor,
  DefenseSimulator,
  DroneApplication,
  DroneSimulator,
  EwarResolver,
  EngagementEvaluator,
  EngagementFrameComposer,
  HitChance,
  Kinematics,
  LockClock,
  MissileApplication,
  MissileBoosterResolver,
  MissileSimulator,
  RngFactory,
  SensorBoosterResolver,
  SimValueParser,
  Simulation,
  StackingPenalty,
  TurretBoosterResolver,
  TurretDamage,
  WeaponClock,
} from "./index";
import type { SimConfig } from "./types";

export interface SimCradle {
  readonly simValueParser: SimValueParser;
  readonly stackingPenalty: StackingPenalty;
  readonly ewarResolver: EwarResolver;
  readonly turretBoosterResolver: TurretBoosterResolver;
  readonly missileBoosterResolver: MissileBoosterResolver;
  readonly sensorBoosterResolver: SensorBoosterResolver;
  readonly kinematics: Kinematics;
  readonly hitChance: HitChance;
  readonly missileApplication: MissileApplication;
  readonly droneApplication: DroneApplication;
  readonly droneSimulator: DroneSimulator;
  readonly missileSimulator: MissileSimulator;
  readonly turretDamage: TurretDamage;
  readonly reactiveSteering: Autopilot;
  readonly shipBSteering: Autopilot;
  readonly shipASteering: Autopilot;
  readonly simulation: Simulation;
  readonly engagementEvaluator: EngagementEvaluator;
  readonly engagementFrameComposer: EngagementFrameComposer;
  readonly defenseAssessor: DefenseAssessor;
  readonly defenseSimulator: DefenseSimulator;
  readonly rngFactory: RngFactory;
  readonly weaponClock: WeaponClock;
  readonly lockClock: LockClock;
  readonly simConfig: SimConfig;
}
