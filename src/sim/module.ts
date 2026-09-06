import { asClass, type AwilixContainer } from "awilix";
import { ReactiveAutopilot } from "./autopilot";
import { DefenseAssessorImpl } from "./defenseAssessment";
import { DefenseSimulatorImpl } from "./defenseSimulator";
import { DroneApplicationImpl } from "./droneApplication";
import { DroneSimulatorImpl } from "./droneSimulator";
import { MissileSimulatorImpl } from "./missileSimulator";
import { EwarResolverImpl } from "./ewarResolver";
import { EngagementEvaluatorImpl } from "./fireControl";
import { EngagementFrameComposerImpl } from "./engagementFrameComposer";
import { EngagementEngineImpl } from "./engagementEngine";
import { MissileBoosterResolverImpl } from "./missileBoosterResolver";
import { SensorBoosterResolverImpl } from "./sensorBoosterResolver";
import { LockClockImpl } from "./lockClock";
import { TurretBoosterResolverImpl } from "./turretBoosterResolver";
import { HitChanceImpl } from "./hitChance";
import { KinematicsImpl } from "./kinematics";
import { MissileApplicationImpl } from "./missileApplication";
import { Mulberry32RngFactory } from "./rng";
import { PredictiveAutopilot } from "./predictiveAutopilot";
import { SimulationImpl } from "./simulation";
import { StackingPenaltyImpl } from "./stackingPenalty";
import { SimValueParserImpl } from "./simValueParser";
import { WeaponClockImpl } from "./weaponClock";
import { WeaponDamageAssessorImpl } from "./weaponDamageAssessor";
import type { SimCradle } from "./cradle";

export function registerSimModule<T extends SimCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    simValueParser: asClass(SimValueParserImpl).singleton(),
    stackingPenalty: asClass(StackingPenaltyImpl).singleton(),
    ewarResolver: asClass(EwarResolverImpl).singleton(),
    turretBoosterResolver: asClass(TurretBoosterResolverImpl).singleton(),
    missileBoosterResolver: asClass(MissileBoosterResolverImpl).singleton(),
    sensorBoosterResolver: asClass(SensorBoosterResolverImpl).singleton(),
    kinematics: asClass(KinematicsImpl).singleton(),
    hitChance: asClass(HitChanceImpl).singleton(),
    missileApplication: asClass(MissileApplicationImpl).singleton(),
    droneApplication: asClass(DroneApplicationImpl).singleton(),
    droneSimulator: asClass(DroneSimulatorImpl).singleton(),
    missileSimulator: asClass(MissileSimulatorImpl).singleton(),
    weaponDamageAssessor: asClass(WeaponDamageAssessorImpl).singleton(),
    reactiveSteering: asClass(ReactiveAutopilot).singleton(),
    shipBSteering: asClass(PredictiveAutopilot).singleton(),
    shipASteering: asClass(PredictiveAutopilot).singleton(),
    simulation: asClass(SimulationImpl).singleton(),
    engagementEvaluator: asClass(EngagementEvaluatorImpl).singleton(),
    engagementFrameComposer: asClass(EngagementFrameComposerImpl).singleton(),
    defenseAssessor: asClass(DefenseAssessorImpl).singleton(),
    defenseSimulator: asClass(DefenseSimulatorImpl).singleton(),
    rngFactory: asClass(Mulberry32RngFactory).singleton(),
    weaponClock: asClass(WeaponClockImpl).singleton(),
    lockClock: asClass(LockClockImpl).singleton(),
    engine: asClass(EngagementEngineImpl).singleton(),
  });
}
