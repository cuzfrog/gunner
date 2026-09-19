import type {
  DefenseAssessor,
  DroneApplication,
  EngagementEngine,
  EwarResolver,
  EngagementEvaluator,
  EngagementFrameComposer,
  FighterApplication,
  HitChance,
  Kinematics,
  MissileApplication,
  MissileBoosterResolver,
  RngFactory,
  SensorBoosterResolver,
  SimValueParser,
  SimWorld,
  SimWorldFactory,
  StackingPenalty,
  TurretBoosterResolver,
  WeaponDamageAssessor,
} from "./index";

export interface SimCradle {
  readonly simValueParser: SimValueParser;
  readonly stackingPenalty: StackingPenalty;
  readonly ewarResolver: EwarResolver;
  readonly turretBoosterResolver: TurretBoosterResolver;
  readonly missileBoosterResolver: MissileBoosterResolver;
  readonly sensorBoosterResolver: SensorBoosterResolver;
  readonly kinematics: Kinematics;
  readonly hitChance: HitChance;
  readonly droneApplication: DroneApplication;
  readonly fighterApplication: FighterApplication;
  readonly missileApplication: MissileApplication;
  readonly weaponDamageAssessor: WeaponDamageAssessor;
  readonly engagementEvaluator: EngagementEvaluator;
  readonly engagementFrameComposer: EngagementFrameComposer;
  readonly defenseAssessor: DefenseAssessor;
  readonly rngFactory: RngFactory;
  readonly simWorldFactory: SimWorldFactory;
  readonly live: SimWorld;
  readonly projection: SimWorld;
  readonly engine: EngagementEngine;
}
